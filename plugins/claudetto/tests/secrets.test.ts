// Lab tests of the `gate.secrets` hook (task 19.16 of change `redesign-0-4-0`): a value of an env file never reaches the model.
// The stub of `tool.call` stands for core: it answers with `reply`. The stubbed files stand for the project at `/p`.
// The file is self-contained, because a lab test cannot import a relative file.
// The env file names are built in code, because the gate denies a command that names one.
// The scan of the project is `rg --files` through `process.run`, and the stub lists the files whose name holds `env`.

import type { On } from "claude-code";
import { type Engine, expect, mock, test } from "claude-code/testing";
import { ENV_HEAD_BITS } from "../modules/gate/limits.ts";
import {
  hashOf,
  newBudget,
  newSalt,
  SALT_ID,
  scrubHashed,
} from "../modules/gate/secrets/domain/hashes.ts";
import { ran, stubState } from "./stubs/process.ts";

const ENV = ".e" + "nv";
const TOKEN = "sk-live-abcdef123456";
const PASS = "hunter2hunter2";

const ENV_NAME = /\/[^/]*e[n]v[^/]*$/;

/** The answer of the stubbed `process.run` for the scan of the project: the env files of `files` for `rg`, and for `find` when `rg` is `missing`. */
const scan = (
  on: On,
  files: Record<string, string>,
  { missing = false, other = (): ReturnType<typeof ran> => ran("") } = {},
) =>
  on("process.run", (_$, e) => {
    const [tool] = e.argv;
    const isScan = tool === "find" || e.argv.includes("--files");
    if (!isScan) return other();
    if (tool === "rg" && missing) return ran("", 127);
    return ran(
      `${Object.keys(files)
        .filter((f) => ENV_NAME.test(f))
        .join("\n")}\n`,
    );
  });

/** The project at `/p` with the files `files` (a path to its text), and the answer `reply` of core. `reads` counts the reads of each file. The state goes to `store`, and `act` runs inside the call, as a command that removes a file does. */
const stub = (
  on: On,
  files: Record<string, string>,
  reply: unknown,
  {
    mtime = (): number => 1,
    root = "/p",
    store = new Map<string, unknown>(),
    scanning = {},
    act = (): void => undefined,
    state = stubState,
    failure = (): string | undefined => undefined,
  }: {
    mtime?: () => number;
    root?: string;
    store?: Map<string, unknown>;
    scanning?: Parameters<typeof scan>[2];
    act?: () => void;
    failure?: () => string | undefined;
    state?: (on: On, store: Map<string, unknown>) => void;
  } = {},
) => {
  const reads: string[] = [];
  on("session.root", () => ({ value: root }));
  on("session.cwd", () => ({ value: root }));
  mock.env(on, { HOME: "/u" });
  scan(on, files, scanning);
  state(on, store);
  on("fs.stat", (_$, e) =>
    e.path in files
      ? {
          value: { kind: "file", size: 0, mtimeMs: mtime(), isLink: false },
        }
      : { deny: "ENOENT" },
  );
  on("fs.read", (_$, e) => {
    reads.push(e.path);
    const failed = failure();
    if (failed !== undefined) return { deny: failed };
    return e.path in files
      ? { value: files[e.path] as string }
      : { deny: "ENOENT" };
  });
  on("tool.call", () => {
    act();
    return { result: reply };
  });
  return reads;
};

const bash = ($: Engine) => $.tool.call({ tool: "Bash", command: "echo hi" });

test("Printed Value: a `Bash` result that prints a value of a key shows the key and not the value", async ($: Engine, on: On) => {
  stub(
    on,
    { [`/p/${ENV}`]: `API_TOKEN=${TOKEN}\n` },
    {
      stdout: `token=${TOKEN}\n`,
      stderr: "",
    },
  );
  const answer = await bash($);
  const shown = JSON.stringify(answer.result);
  expect(shown).toContain("[value of API_TOKEN]");
  expect(shown).not.toContain(TOKEN);
});

test("No Value: a result with no value stays as it is", async ($: Engine, on: On) => {
  const reply = { stdout: "all good\n", stderr: "" };
  stub(on, { [`/p/${ENV}`]: `API_TOKEN=${TOKEN}\n` }, reply);
  expect((await bash($)).result).toStrictEqual(reply);
});

test("Other Name: a value of `prod.env` in a subfolder is replaced", async ($: Engine, on: On) => {
  stub(on, { "/p/conf/prod.env": `DB_PASS=${PASS}\n` }, `login ${PASS}`);
  expect((await bash($)).result).toBe("login [value of DB_PASS]");
});

test("Renamed Copy: a `Read` of a copy under another name shows no value", async ($: Engine, on: On) => {
  const content = `DB_PASS=${PASS}\n`;
  stub(
    on,
    { [`/p/${ENV}`]: content, "/p/copy.txt": content },
    {
      type: "text",
      file: { filePath: "/p/copy.txt", content },
    },
  );
  const answer = await $.tool.call({ tool: "Read", file_path: "/p/copy.txt" });
  expect(JSON.stringify(answer.result)).not.toContain(PASS);
  expect(JSON.stringify(answer.result)).toContain("DB_PASS=[value of DB_PASS]");
});

test("Base64 Form: the base64 of a value is replaced, and so is a content array", async ($: Engine, on: On) => {
  stub(on, { [`/p/${ENV}`]: `API_TOKEN=${TOKEN}\n` }, [
    { type: "text", text: `Zm9v ${btoa(TOKEN)} ${TOKEN}` },
  ]);
  const shown = JSON.stringify((await bash($)).result);
  expect(shown).not.toContain(btoa(TOKEN));
  expect(shown).not.toContain(TOKEN);
  expect(shown).toContain("Zm9v [value of API_TOKEN] [value of API_TOKEN]");
});

test("Parsing: `export`, quotes, and a comment give the value, and a short value or a commented line is kept", async ($: Engine, on: On) => {
  const text = `export DB_PASS="${PASS}" # the pass\nDEBUG=true\nPORT=3000\n# OLD=oldoldoldold\nNAME='dev'\n`;
  stub(
    on,
    { [`/p/${ENV}`]: text },
    `${PASS} true 3000 oldoldoldold dev the pass`,
  );
  expect((await bash($)).result).toBe(
    "[value of DB_PASS] true 3000 oldoldoldold dev the pass",
  );
});

test("Search Tool: a result of `grep` is cleaned too", async ($: Engine, on: On) => {
  stub(on, { [`/p/${ENV}`]: `API_TOKEN=${TOKEN}\n` }, "unused", {
    scanning: { other: () => ran(`src/a.ts:1:x = "${TOKEN}"\n`) },
  });
  on("tool.list", () => ({ value: [] }));
  const answer = await $.tool.call({
    tool: "mcp__claudetto__grep",
    pattern: "x",
    output_mode: "content",
  });
  expect(JSON.stringify(answer)).not.toContain(TOKEN);
});

test("Unchanged File: a file is read again only when its modification time changes", async ($: Engine, on: On) => {
  let mtime = 1;
  const reads = stub(on, { [`/w/${ENV}`]: `API_TOKEN=${TOKEN}\n` }, "x", {
    mtime: () => mtime,
    root: "/w",
  });
  await bash($);
  await bash($);
  const before = reads.length;
  mtime = 2;
  await bash($);
  expect([before, reads.length]).toStrictEqual([1, 2]);
});

for (const [name, target] of [
  ["Moved Away", "notes.txt"],
  ["Renamed Example", `${ENV}.example`],
] as const)
  test(`${name}: a value stays replaced after \`mv ${ENV} ${target}\` removes the env file`, async ($: Engine, on: On) => {
    const files: Record<string, string> = {
      [`/p/${ENV}`]: `MOVED_KEY=${TOKEN}\n`,
    };
    stub(on, files, `moved ${TOKEN}`);
    await $.tool.call({ tool: "Bash", command: `mv ${ENV} ${target}` });
    delete files[`/p/${ENV}`];
    files[`/p/${target}`] = `MOVED_KEY=${TOKEN}\n`;
    const answer = await $.tool.call({
      tool: "Bash",
      command: `cat ${target}`,
    });
    expect(answer.result).toBe("moved [value of MOVED_KEY]");
  });

for (const [name, line, shown, key] of [
  ["Short Pass", "DB_PASSWORD=admin1", "login admin1 now", "DB_PASSWORD"],
  ["Short Key", "API_KEY=abcd", "login abcd now", "API_KEY"],
] as const)
  test(`${name}: a value of 4 to 7 characters under a secret key name is replaced as a whole word`, async ($: Engine, on: On) => {
    stub(on, { [`/p/${ENV}`]: `${line}\n` }, shown);
    expect((await bash($)).result).toBe(`login [value of ${key}] now`);
  });

test("Short Plain: a short value under a plain key name stays", async ($: Engine, on: On) => {
  const text = "port 8080 debug true";
  stub(on, { [`/p/${ENV}`]: "PORT=8080\nDEBUG=true\n" }, text);
  expect((await bash($)).result).toBe(text);
});

test("Short Inside: a short value inside a longer word stays", async ($: Engine, on: On) => {
  stub(on, { [`/p/${ENV}`]: "API_KEY=abcd\n" }, "abcde xabcd abcd_ abcd");
  expect((await bash($)).result).toBe("abcde xabcd abcd_ [value of API_KEY]");
});

test("Deep File: a value in a file 5 folders deep is replaced", async ($: Engine, on: On) => {
  stub(on, { [`/p/a/b/c/d/e/${ENV}`]: `API_TOKEN=${TOKEN}\n` }, `t ${TOKEN}`);
  expect((await bash($)).result).toBe("t [value of API_TOKEN]");
});

test("No Rg: the scan uses `find` when `rg` is missing", async ($: Engine, on: On) => {
  const files = { [`/p/x/${ENV}`]: `API_TOKEN=${TOKEN}\n` };
  stub(on, files, `t ${TOKEN}`, { scanning: { missing: true } });
  expect((await bash($)).result).toBe("t [value of API_TOKEN]");
});

/** The lines of the context of a call that say some env files are not masked. */
const warned = (context: readonly string[] | undefined) =>
  (context ?? []).filter((c) => c.includes("not masked"));

/** The lines of the context of a call that say a short value may show after its file is gone. */
const shortWarned = (context: readonly string[] | undefined) =>
  (context ?? []).filter((c) => c.includes("may show"));

let tick = 0;

test("Over The Bound: a scan over the bound of files adds one line that says some env files are not masked", async ($: Engine, on: On) => {
  const files: Record<string, string> = {};
  for (let i = 0; i < 1001; i++)
    files[`/p/d${i}/${ENV}`] = `K${i}=value-number-${i}\n`;
  stub(on, files, "x");
  expect(warned((await bash($)).context).length).toBe(1);
});

test("Under The Bound: a scan under the bound adds no line", async ($: Engine, on: On) => {
  stub(on, { [`/p/${ENV}`]: `API_TOKEN=${TOKEN}\n` }, "x");
  expect(warned((await bash($)).context)).toStrictEqual([]);
});

test("Long File: a file over the size bound adds the line", async ($: Engine, on: On) => {
  const text = `API_TOKEN=${TOKEN}\n${"#".repeat(300_000)}`;
  stub(on, { [`/p/${ENV}`]: text }, "x");
  expect(warned((await bash($)).context).length).toBe(1);
});

test("Reload: a value that the filter saw stays replaced with the file gone, and the state holds no value", async ($: Engine, on: On) => {
  const files: Record<string, string> = {
    [`/p/${ENV}`]: `API_TOKEN=${TOKEN}\nDB_PASSWORD=admin1\n`,
  };
  const store = new Map<string, unknown>();
  stub(on, files, `${TOKEN} admin1 ${btoa(TOKEN)}`, { store });
  await bash($);
  delete files[`/p/${ENV}`];
  const kept = JSON.stringify([...store]);
  expect(kept).not.toContain(TOKEN);
  expect(kept).not.toContain("admin1");
  expect((await bash($)).result).toBe(
    "[value of API_TOKEN] [value of DB_PASSWORD] [value of API_TOKEN]",
  );
});

/** A short value that the filter saw stays replaced when the next read of its file fails after a new modification time. */
const failedRead = async (
  $: Engine,
  on: On,
  failed: string,
): Promise<unknown> => {
  const files = { [`/p/${ENV}`]: `SHORT_PASS=hunt3r\n` };
  let time = 1;
  let reason: string | undefined;
  stub(on, files, "login hunt3r now", {
    mtime: () => time,
    failure: () => reason,
  });
  await bash($);
  time = 2;
  reason = failed;
  return (await bash($)).result;
};

test("Unreadable File: a short value stays replaced when a touched file can no longer be read", async ($: Engine, on: On) => {
  expect(await failedRead($, on, "EACCES")).toBe(
    "login [value of SHORT_PASS] now",
  );
});

test("Gone At Read: a short value stays replaced when the file is gone between `stat` and `read`", async ($: Engine, on: On) => {
  expect(await failedRead($, on, "ENOENT")).toBe(
    "login [value of SHORT_PASS] now",
  );
});

/** The records that the mod kept in the state under `envHashes`. */
const records = (store: Map<string, unknown>) =>
  Object.values(
    (store.get("envHashes") ?? {}) as Record<
      string,
      { key: string; len: number; head: number }
    >,
  );

test("Short Value: a value of 6 characters has no record in the state, and the same mod still replaces it", async ($: Engine, on: On) => {
  const files: Record<string, string> = {
    [`/p/${ENV}`]: `SHORT_PASS=hunt3r\nAPI_TOKEN=${TOKEN}\n`,
  };
  const store = new Map<string, unknown>();
  stub(on, files, "login hunt3r now", { store });
  await bash($);
  delete files[`/p/${ENV}`];
  const answer = await bash($);
  expect(records(store).filter((r) => r.key === "SHORT_PASS")).toStrictEqual(
    [],
  );
  expect(answer.result).toBe("login [value of SHORT_PASS] now");
});

test("Long Value Reload: a value of 20 characters is replaced from the state alone, with the file gone", async ($: Engine, on: On) => {
  const files: Record<string, string> = {
    [`/p/${ENV}`]: `API_TOKEN=${TOKEN}\n`,
  };
  const store = new Map<string, unknown>();
  stub(on, files, `t ${TOKEN}`, { store });
  await bash($);
  delete files[`/p/${ENV}`];
  expect(records(store).some((r) => r.key === "API_TOKEN")).toBe(true);
  expect((await bash($)).result).toBe("t [value of API_TOKEN]");
});

/** Keeps the state with versions, as the engine does. A write of another call lands after the first `state.get`, so the first `state.set` with that version misses. */
const racing =
  (other: Record<string, unknown>) =>
  (on: On, store: Map<string, unknown>): void => {
    const held = { version: 0 };
    let isRaced = false;
    on("state.get", (_$, e) => {
      const answer = { value: store.get(e.key), version: held.version };
      if (!isRaced) {
        isRaced = true;
        store.set(e.key, other);
        held.version++;
      }
      return { value: answer };
    });
    on("state.set", (_$, e) => {
      if (e.ifVersion !== undefined && e.ifVersion !== held.version)
        return { value: { isSet: false, version: held.version } };
      store.set(e.key, e.value);
      held.version++;
      return { value: { isSet: true, version: held.version } };
    });
  };

test("Parallel Write: a write that misses is read again and merged, so the record of the other call stays and the value is replaced with the file gone", async ($: Engine, on: On) => {
  const files: Record<string, string> = {
    [`/p/${ENV}`]: `API_TOKEN=${TOKEN}\n`,
  };
  const other = { ["a".repeat(64)]: { key: "OTHER_KEY", len: 20, head: 1 } };
  const store = new Map<string, unknown>();
  stub(on, files, `t ${TOKEN}`, { store, state: racing(other) });
  await bash($);
  delete files[`/p/${ENV}`];
  const answer = await bash($);
  expect(records(store).map((r) => r.key)).toContain("OTHER_KEY");
  expect(records(store).map((r) => r.key)).toContain("API_TOKEN");
  expect(answer.result).toBe("t [value of API_TOKEN]");
});

test("Head Bits: the stored head of a value is below 2^32, and not cut to 20 bits", async ($: Engine, on: On) => {
  const store = new Map<string, unknown>();
  stub(on, { [`/p/${ENV}`]: `API_TOKEN=${TOKEN}\nDB_PASS=${PASS}\n` }, "x", {
    store,
  });
  await bash($);
  const heads = records(store)
    .filter((r) => r.len > 0)
    .map((r) => r.head);
  expect(heads.length).toBeGreaterThan(0);
  expect(heads.every((h) => h < 2 ** 32)).toBe(true);
  expect(heads.some((h) => h >= 2 ** 20)).toBe(true);
});

test("Old Head: records of an older reload with a 20-bit head are dropped, and the value is recorded again", async ($: Engine, on: On) => {
  const files: Record<string, string> = {
    [`/p/${ENV}`]: `API_TOKEN=${TOKEN}\n`,
  };
  const old = {
    salt: { key: "0".repeat(32), len: 0, head: 0 },
    ["b".repeat(64)]: { key: "OLD_KEY", len: 20, head: 7 },
  };
  const store = new Map<string, unknown>([["envHashes", old]]);
  stub(on, files, `t ${TOKEN}`, { store });
  await bash($);
  delete files[`/p/${ENV}`];
  const answer = await bash($);
  expect(records(store).map((r) => r.key)).not.toContain("OLD_KEY");
  expect(answer.result).toBe("t [value of API_TOKEN]");
});

test("Gone In Call: a value that the call prints and removes with its file stays replaced, also past the records of one read", async ($: Engine, on: On) => {
  const files: Record<string, string> = {
    [`/p/${ENV}`]: Array.from(
      { length: 8 },
      (_, i) => `CALL_${i}=call-value-${i}-xxxxxxxx\n`,
    ).join(""),
  };
  stub(on, files, "printed call-value-7-xxxxxxxx", {
    act: () => {
      delete files[`/p/${ENV}`];
    },
  });
  expect((await bash($)).result).toBe("printed [value of CALL_7]");
});

test("Plain Pairs: pairs that are never masked do not fill the memory of short values", async ($: Engine, on: On) => {
  const files: Record<string, string> = {
    [`/p/${ENV}`]: `${Array.from({ length: 600 }, (_, i) => `N${i}=1\n`).join("")}PASS_Q=zq9x\n`,
  };
  stub(on, files, "login zq9x now");
  await bash($);
  delete files[`/p/${ENV}`];
  expect((await bash($)).result).toBe("login [value of PASS_Q] now");
});

test("Short Lines: a short line of a long multiline value stays replaced with the file gone", async ($: Engine, on: On) => {
  const files: Record<string, string> = {
    [`/p/${ENV}`]:
      'MULTI_KEY="-----BEGIN KEY-----\ns3cr3t7\n-----END KEY-----"\n',
  };
  stub(on, files, "line s3cr3t7 end");
  await bash($);
  delete files[`/p/${ENV}`];
  expect((await bash($)).result).toBe("line [value of MULTI_KEY] end");
});

/** A text of `size` characters from a fixed seed, so that a run repeats. */
const randomText = (seed: number, size: number): string => {
  let s = seed;
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789 ";
  return Array.from({ length: size }, () => {
    s = (Math.imul(s, 1_103_515_245) + 12_345) >>> 0;
    return chars[(s >>> 8) % chars.length];
  }).join("");
};

/** Calls until the records in `store` stop growing, because a read makes a bounded number of them. */
const settle = async ($: Engine, store: Map<string, unknown>) => {
  for (let was = -1; was < records(store).length; ) {
    was = records(store).length;
    await bash($);
  }
};

test("Confirm Bound: a result with more finds than the bound of slow confirms stays masked and adds one line", async ($: Engine, on: On) => {
  const values = Array.from({ length: 8 }, (_, i) => randomText(i + 500, 20));
  const files: Record<string, string> = {
    [`/p/${ENV}`]: values.map((v, i) => `BOUND_${i}=${v}\n`).join(""),
  };
  const store = new Map<string, unknown>();
  stub(on, files, values.join(" "), { store });
  await settle($, store);
  delete files[`/p/${ENV}`];
  const answer = await bash($);
  expect(answer.result).toBe(
    values.map((_, i) => `[value of BOUND_${i}]`).join(" "),
  );
  expect(answer.context?.length).toBe(1);
});

test("Doubled Head: a false find before a real value, with no confirm left, still hides the whole value", async ($: Engine, on: On) => {
  const [decoy, value] = ["decoy9876543210abcdef", "dbl-abcd1234wxyz5678"];
  const files: Record<string, string> = {
    [`/p/${ENV}`]: `DECOY_KEY=${decoy}\nDOUBLE_KEY=${value}\n`,
  };
  const head = value.slice(0, 8);
  const shown = `${decoy.slice(0, 8)}zzzzzzzzzzzz ${head}${value}`;
  const store = new Map<string, unknown>();
  stub(on, files, shown, { store });
  await settle($, store);
  delete files[`/p/${ENV}`];
  const answer = await bash($);
  expect(answer.result).toBe(
    `${decoy.slice(0, 8)}zzzzzzzzzzzz [value of DOUBLE_KEY]`,
  );
});

test(
  "Speed: a result of 30,000 characters of varied text with 200 records is cleaned with no cut line and one slow check",
  { timeoutMs: 120_000 },
  async ($: Engine, on: On) => {
    const files: Record<string, string> = {
      [`/p/${ENV}`]: Array.from(
        { length: 80 },
        (_, i) => `SPEED_${i}=${randomText(i + 1, 20)}\n`,
      ).join(""),
    };
    const planted = randomText(1, 20);
    const base = randomText(99_991, 30_000);
    const text = `${base.slice(0, 15_000)}${planted}${base.slice(15_020)}`;
    const sets: string[] = [];
    class Counted extends Map<string, unknown> {
      override set(key: string, value: unknown) {
        sets.push(key);
        return super.set(key, value);
      }
    }
    const store = new Counted();
    const reads = stub(on, files, text, { store });
    await settle($, store);
    delete files[`/p/${ENV}`];
    const setsBefore = sets.length;
    const readsBefore = reads.length;
    const answer = await bash($);
    expect(records(store).length).toBeGreaterThanOrEqual(200);
    expect(JSON.stringify(answer.result)).toContain("[value of SPEED_0]");
    expect(JSON.stringify(answer.result)).not.toContain(planted);
    expect(answer.context).toBeUndefined();
    // The call hashes no value again: it writes no record and reads no file.
    expect(
      sets.slice(setsBefore).filter((k) => k === "envHashes"),
    ).toStrictEqual([]);
    expect(reads.length - readsBefore).toBe(0);
    // The slow checks are counted on the same filter, because a lab test cannot see inside the mod.
    const salt = newSalt();
    const known: Parameters<typeof scrubHashed>[1] = {
      [SALT_ID]: { key: salt, len: 0, head: ENV_HEAD_BITS },
    };
    for (let i = 0; i < 200; i++) {
      const [hash, record] = hashOf(salt, `SPEED_${i}`, randomText(i + 1, 20));
      known[hash] = record;
    }
    const budget = newBudget(known);
    scrubHashed(text, known, budget);
    expect(budget.isCut).toBe(false);
    expect(budget.seen.size).toBe(1);
  },
);

test(
  "Unsaved Hashes: a write that keeps missing hashes the values once, and the next call only tries the write again",
  { timeoutMs: 120_000 },
  async ($: Engine, on: On) => {
    const written: unknown[] = [];
    const store = new Map<string, unknown>();
    stub(
      on,
      {
        [`/p/${ENV}`]: Array.from(
          { length: 6 },
          (_, i) => `MISS_${i}=missing-value-${i}-xxxx\n`,
        ).join(""),
      },
      "x",
      {
        store,
        state: (o) => {
          o("state.get", () => ({ value: { value: undefined, version: 0 } }));
          o("state.set", (_$, e) => {
            if (e.key === "envHashes") written.push(e.value);
            return { value: { isSet: false, version: 1 } };
          });
        },
      },
    );
    await bash($);
    const firstWrites = written.length;
    await bash($);
    const secondWrites = written.length - firstWrites;
    const keysOf = (w: unknown) => Object.keys(w as object).sort();
    const salts = written.map(
      (w) => (w as Record<string, { key: string }>)[SALT_ID]?.key,
    );
    expect(written.length).toBeGreaterThan(5);
    expect(new Set(salts).size).toBe(1);
    // The second call tries the same records again and makes no new one.
    expect(secondWrites).toBeGreaterThan(0);
    expect(keysOf(written.at(-1))).toStrictEqual(
      keysOf(written[firstWrites - 1]),
    );
  },
);

/** A project with 520 short values, which are more than the bound of the memory. */
const manyShorts = (): Record<string, string> => ({
  [`/p/${ENV}`]: Array.from(
    { length: 520 },
    (_, i) => `SECRET_${i}=s3c${String(i).padStart(4, "0")}x\n`,
  ).join(""),
});

test("Short Values Bound: a project with more short values than the bound of the memory adds the line that a short value may show after its file is gone", async ($: Engine, on: On) => {
  const files = manyShorts();
  stub(on, files, "x");
  const answer = await bash($);
  expect(shortWarned(answer.context).length).toBe(1);
});

test("Short Values Pruned: values that an edit removed from a file that exists do not fill the memory", async ($: Engine, on: On) => {
  const files: Record<string, string> = {};
  stub(on, files, "x", { mtime: () => ++tick });
  for (let round = 0; round < 6; round++) {
    files[`/p/${ENV}`] = Array.from(
      { length: 100 },
      (_, i) => `SECRET_${i}=s3c${round}${String(i).padStart(3, "0")}x\n`,
    ).join("");
    await bash($);
  }
  const answer = await bash($);
  expect(shortWarned(answer.context)).toStrictEqual([]);
});

test("Short Values Kept: a value of a file that is gone stays masked, and the line names the time after a file is gone", async ($: Engine, on: On) => {
  const files = manyShorts();
  stub(on, files, "has s3c0001x here");
  const full = await bash($);
  delete files[`/p/${ENV}`];
  expect((await bash($)).result).toBe("has [value of SECRET_1] here");
  expect(shortWarned(full.context)).toStrictEqual([
    "A short value of an env file may show in a result after its file is gone, because the filter keeps no more than 500 short values in memory.",
  ]);
});

test(
  "Values Bound: a project with more values than the bound of records adds the line that some env files are not masked",
  { timeoutMs: 120_000 },
  async ($: Engine, on: On) => {
    const files: Record<string, string> = {
      [`/p/${ENV}`]: Array.from(
        { length: 520 },
        (_, i) => `V${i}=value-number-${i}-xxxx\n`,
      ).join(""),
    };
    const store = new Map<string, unknown>();
    stub(on, files, "x", { store });
    await settle($, store);
    expect(warned((await bash($)).context).length).toBe(1);
  },
);
