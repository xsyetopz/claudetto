// The `tool.check` handler of the `guard` slice with a fake `$` (spec `permission-gate`, task 5.1 of change `0-3-0`).
// A `$.tool.check` query of the lab gives no `decider`, so this test calls the handler and reads its verdict.
// The fake `process.run` stands for `git`, so no command runs.

import { expect, test } from "bun:test";
import { ATTEMPT_TIMEOUT_MS } from "../../../plugins/claudetto/kernel/budget.ts";
import {
  keepOptions,
  onCheck,
  onCheckFail,
} from "../../../plugins/claudetto/slices/guard/adapters/mod.ts";
import { JEV_YES_MIN } from "../../../plugins/claudetto/slices/guard/limits.ts";

type Verdict = { decision: string; decider?: string; reason?: string };

/** A fake `$` of a session at `/p`, with a `git` whose `status` prints `status`, and the argv of each run in `runs`. */
const fake = (status: string, runs: (readonly string[])[] = []) => ({
  session: { cwd: async () => "/p" },
  env: { get: async (name: string) => ({ HOME: "/u", TMPDIR: "/t/" })[name] },
  fs: { stat: async () => Promise.reject(new Error("ENOENT")) },
  process: {
    run: async (argv: readonly string[]) => {
      runs.push(argv);
      return { exitCode: 0, stdout: status, stderr: "" };
    },
  },
});

const check = (command: string, engine: Verdict, $ = fake("")) =>
  (onCheck as unknown as (...a: unknown[]) => Promise<Verdict>)(
    $,
    { tool: "Bash", input: { command } },
    async () => engine,
  );

test("Local Git Loss: `git clean -fd` over an untracked file asks a person, so the dialog shows no always-allow row", async () => {
  const runs: (readonly string[])[] = [];
  const v = await check(
    "git clean -fd",
    { decision: "allow" },
    fake("?? notes.md\n", runs),
  );
  expect(v).toMatchObject({ decision: "ask", decider: "person" });
  expect(runs).toStrictEqual([
    ["git", "-C", "/p", "status", "--porcelain", "--untracked-files=all", "--"],
  ]);
});

test("Committed File: a clean `status` and a found file give `allow` over the ask of the mode", async () => {
  expect(await check("rm src/old.ts", { decision: "ask" })).toStrictEqual({
    decision: "allow",
  });
});

test("a `deny` of the engine stays", async () => {
  const deny = { decision: "deny", reason: "rule" };
  expect(await check("ls", deny)).toBe(deny);
});

test("the temp folder of `TMPDIR` loses its last slash", async () => {
  expect((await check("rm -rf $TMPDIR/x", { decision: "ask" })).decision).toBe(
    "allow",
  );
});

test("Gate Fails Closed: the error handler asks a person, and the reason names the gate", () => {
  const v = (onCheckFail as unknown as () => Verdict)();
  expect(v).toMatchObject({ decision: "ask", decider: "person" });
  expect(v.reason).toContain("`guard`");
});

// "Jev before a Person" (task 5.1a, 10.15): a fake `$.http.fetch` answers for the TypeSafe API, and `git` prints an untracked `notes.md`.
type Reply = { status: number; ok: boolean; headers: object; text: string };
type Fetch = {
  url: string;
  init?: { headers?: Record<string, string>; body?: string } | undefined;
};

/** A reply of the API with the `noul` answer `q`, or the `status` with no answer. */
const answerOf =
  (noul: number, status = 200) =>
  async (): Promise<Reply> => ({
    status,
    ok: status === 200,
    headers: {},
    text: JSON.stringify({ answers: { q: { type: "noul", noul } } }),
  });

/** A fake `$` with the key `key`, whose `git` prints an untracked `notes.md`, whose `http.fetch` gives `jev`, and whose `clock.sleep` waits for an abort. */
const jevFake = (
  key: string | undefined,
  jev: () => Promise<Reply>,
  runs: (readonly string[])[] = [],
  fetches: Fetch[] = [],
) => ({
  ...fake("?? notes.md\n", runs),
  env: {
    get: async (name: string) =>
      ({ HOME: "/u", TMPDIR: "/t/", TYPESAFE_API_KEY: key })[name],
  },
  http: {
    fetch: async (url: string, init?: Fetch["init"]) => {
      fetches.push({ url, init });
      return jev();
    },
  },
  clock: {
    sleep: (_ms: number, options?: { signal?: AbortSignal }) =>
      new Promise<void>((_resolve, reject) =>
        options?.signal?.addEventListener("abort", () =>
          reject(new Error("aborted")),
        ),
      ),
  },
});

const sure = answerOf(0.93);

test("Jev Is Sure: a confident yes allows the `git` loss, and the reason names Jev and `P(yes)`", async () => {
  keepOptions({ decide: "jev" });
  const runs: (readonly string[])[] = [];
  const fetches: Fetch[] = [];
  const v = await check(
    "git clean -fd",
    { decision: "ask" },
    jevFake("k", sure, runs, fetches) as never,
  );
  expect(v).toStrictEqual({
    decision: "allow",
    reason: "Jev approved this call with `P(yes)` = 0.93.",
  });
  expect(runs.every((r) => r[0] === "git")).toBe(true);
  expect(fetches).toHaveLength(1);
  expect(fetches[0]?.url).toBe("https://api.typesafe.ai/v1/systemone");
  expect(fetches[0]?.init?.headers?.["authorization"]).toBe("Bearer k");
  const body = JSON.parse(fetches[0]?.init?.body ?? "{}");
  expect(body.state).toContain("Command: git clean -fd");
  expect(body.questions.q.type).toBe("noul");
  expect(fetches[0]?.init?.body).not.toContain('"k"');
});

// The floor is `JEV_YES_MIN` of 0.8, above the 0.7 of `primitives-noul.md`, because a false yes loses files (the user, 2026-10-23: "follow typesafe's guidelines/best practices").
test("Jev Is Sure: a yes at `JEV_YES_MIN` allows the call", async () => {
  keepOptions({ decide: "jev" });
  const v = await check(
    "git clean -fd",
    { decision: "ask" },
    jevFake("k", answerOf(JEV_YES_MIN)) as never,
  );
  expect(v).toMatchObject({ decision: "allow" });
});

for (const [name, key, decide, jev] of [
  ["a yes under the bound", "k", "jev", answerOf(0.79)],
  ["a no", "k", "jev", answerOf(0.05)],
  ["a failed call", "k", "jev", answerOf(0.9, 500)],
  [
    "a call that throws",
    "k",
    "jev",
    () => Promise.reject(new Error("timeout")),
  ],
  ["no key", undefined, "jev", sure],
  ["the option `off`", "k", "off", sure],
] as const)
  test(`Jev Is Not Sure: ${name} asks a person, so the dialog shows no always-allow row`, async () => {
    keepOptions({ decide });
    const v = await check(
      "git clean -fd",
      { decision: "allow" },
      jevFake(key, jev) as never,
    );
    expect(v).toMatchObject({ decision: "ask", decider: "person" });
    expect(v).not.toHaveProperty("jev");
  });

test("Timeout: a call that never answers ends at `ATTEMPT_TIMEOUT_MS` with no retry, and a person decides", async () => {
  keepOptions({ decide: "jev" });
  const slept: number[] = [];
  const fetches: Fetch[] = [];
  const $ = {
    ...jevFake("k", () => new Promise<Reply>(() => {}), [], fetches),
    clock: {
      sleep: async (ms: number) => {
        slept.push(ms);
      },
    },
  };
  const v = await check("git clean -fd", { decision: "allow" }, $ as never);
  expect(v).toMatchObject({ decision: "ask", decider: "person" });
  expect(slept).toStrictEqual([ATTEMPT_TIMEOUT_MS]);
  expect(fetches).toHaveLength(1);
});

test("an `ask` that is not a loss, such as a forced push, goes to a person and not to Jev", async () => {
  keepOptions({ decide: "jev" });
  const fetches: Fetch[] = [];
  const v = await check(
    "git push --force",
    { decision: "allow" },
    jevFake("k", sure, [], fetches) as never,
  );
  expect(v).toMatchObject({ decision: "ask", decider: "person" });
  expect(fetches).toEqual([]);
});

// Task 5.2: each `ask` goes to the log of the session, and a log that cannot be written changes no verdict.
/** `$` with an in-memory file system in `files`, the session `s1`, and the time 0. */
const withLog = <T extends object>(
  $: T,
  files: Map<string, string>,
  write = async (path: string, text: string) => {
    files.set(path, text);
  },
) => ({
  ...$,
  session: { ...($ as { session: object }).session, id: async () => "s1" },
  clock: { ...($ as { clock?: object }).clock, now: async () => 0 },
  fs: {
    ...($ as { fs: object }).fs,
    exists: async (path: string) => files.has(path),
    read: async (path: string) => files.get(path) ?? "",
    write,
  },
});

const LOG = "/t/claudetto/gate/s1.jsonl";
const lines = (files: Map<string, string>) =>
  (files.get(LOG) ?? "")
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l));

test("Gate Log: two checks at the same time keep both lines, each with its reason and `person`", async () => {
  keepOptions({ decide: "off" });
  const files = new Map<string, string>();
  const $ = withLog(fake("?? notes.md\n"), files) as never;
  await Promise.all([
    check("git clean -fd", { decision: "allow" }, $),
    check("git clean -fd .", { decision: "allow" }, $),
  ]);
  const got = lines(files);
  expect(got.map((l) => l.target).sort()).toStrictEqual([
    "git clean -fd",
    "git clean -fd .",
  ]);
  expect(
    got.every(
      (l) =>
        l.decider === "person" &&
        l.tool === "Bash" &&
        l.reason.includes("git clean"),
    ),
  ).toBe(true);
  expect(got[0].at).toBe("1970-01-01T00:00:00.000Z");
});

test("Gate Log: an `ask` that Jev allows has the decider `jev`", async () => {
  keepOptions({ decide: "jev" });
  const files = new Map<string, string>();
  await check(
    "git clean -fd",
    { decision: "ask" },
    withLog(jevFake("k", sure), files) as never,
  );
  expect(lines(files).map((l) => l.decider)).toStrictEqual(["jev"]);
});

test("Gate Log: an `allow` writes no line", async () => {
  const files = new Map<string, string>();
  await check("ls", { decision: "allow" }, withLog(fake(""), files) as never);
  expect(files.size).toBe(0);
});

test("Gate Log: a write that fails keeps the `ask` for a person", async () => {
  keepOptions({ decide: "off" });
  const $ = withLog(fake("?? notes.md\n"), new Map(), async () => {
    throw new Error("disk full");
  }) as never;
  expect(await check("git clean -fd", { decision: "allow" }, $)).toMatchObject({
    decision: "ask",
    decider: "person",
  });
});

test("Gate Log: an `ask` at red writes one line with its reason and `person`", async () => {
  const files = new Map<string, string>();
  const $ = withLog(fake(""), files) as { session: object };
  $.session = {
    ...$.session,
    usage: async () => ({
      rateLimits: [{ kind: "five_hour", percentUsed: 95 }],
    }),
  };
  const v = await check("just sandbox", { decision: "allow" }, $ as never);
  expect(v).toMatchObject({ decision: "ask", decider: "person" });
  expect(lines(files)).toMatchObject([
    { tool: "Bash", reason: v.reason, decider: "person" },
  ]);
});
