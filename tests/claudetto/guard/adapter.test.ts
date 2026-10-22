// The `tool.check` handler of the `guard` slice with a fake `$` (spec `permission-gate`, task 5.1 of change `0-3-0`).
// A `$.tool.check` query of the lab gives no `decider`, so this test calls the handler and reads its verdict.
// The fake `process.run` stands for `git`, so no command runs.

import { expect, test } from "bun:test";
import {
  keepOptions,
  onCheck,
  onCheckFail,
} from "../../../plugins/claudetto/slices/guard/adapters/mod.ts";

type Verdict = { decision: string; decider?: string; reason?: string };

/** A fake `$` of a session at `/p`, with a `git` whose `status` prints `status`, and the argv of each run in `runs`. */
const fake = (status: string, runs: (readonly string[])[] = []) => ({
  session: { cwd: async () => "/p" },
  env: { get: async (name: string) => ({ HOME: "/u", TMPDIR: "/t/" })[name] },
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

test("Uncommitted File: the delete asks a person, so the dialog shows no always-allow row", async () => {
  const runs: (readonly string[])[] = [];
  const v = await check(
    "rm notes.md",
    { decision: "allow" },
    fake("?? notes.md\n", runs),
  );
  expect(v).toMatchObject({ decision: "ask", decider: "person" });
  expect(runs).toStrictEqual([
    [
      "git",
      "-C",
      "/p",
      "status",
      "--porcelain",
      "--untracked-files=all",
      "--ignored",
      "--",
      "/p/notes.md",
    ],
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

// "Jev before a Person" (task 5.1a): a fake `claudetto-decide` answers with `stdout`, and `git` says that `notes.md` has no commit.
const JEV_SURE = '{"text":"yes","answer":{"choice":"yes","confidence":0.93}}';

/** A fake `$` with the key `key`, whose `git` prints an untracked `notes.md`, and whose Jev run gives `jev`. */
const jevFake = (
  key: string | undefined,
  jev: () => Promise<{ exitCode: number; stdout: string }>,
  runs: (readonly string[])[] = [],
) => ({
  ...fake(""),
  plugin: { root: "/root" },
  env: {
    get: async (name: string) =>
      ({ HOME: "/u", TMPDIR: "/t/", TYPESAFE_API_KEY: key })[name],
  },
  process: {
    run: async (argv: readonly string[]) => {
      runs.push(argv);
      return argv[0] === "git"
        ? { exitCode: 0, stdout: "?? notes.md\n", stderr: "" }
        : { ...(await jev()), stderr: "" };
    },
  },
});

const sure = async () => ({ exitCode: 0, stdout: JEV_SURE });

test("Jev Is Sure: a confident yes allows the delete, and the reason names Jev and `P(yes)`", async () => {
  keepOptions({ decide: "jev" });
  const runs: (readonly string[])[] = [];
  const v = await check(
    "rm notes.md",
    { decision: "ask" },
    jevFake("k", sure, runs) as never,
  );
  expect(v).toStrictEqual({
    decision: "allow",
    reason: "Jev approved this call with `P(yes)` = 0.93.",
  });
  const jev = runs.find((r) => r[0] === "bun") ?? [];
  expect(jev.slice(1, 5)).toStrictEqual([
    "--no-env-file",
    "/root/bin/claudetto-decide",
    "yes",
    "--json",
  ]);
  expect(jev.join(" ")).toContain("Command: rm notes.md");
});

for (const [name, key, decide, jev] of [
  [
    "a yes under the bound",
    "k",
    "jev",
    async () => ({
      exitCode: 0,
      stdout: '{"answer":{"choice":"yes","confidence":0.79}}',
    }),
  ],
  [
    "a no",
    "k",
    "jev",
    async () => ({
      exitCode: 0,
      stdout: '{"answer":{"choice":"no","confidence":0.95}}',
    }),
  ],
  ["a failed run", "k", "jev", async () => ({ exitCode: 3, stdout: "" })],
  [
    "a run that throws, such as on a timeout",
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
      "rm notes.md",
      { decision: "allow" },
      jevFake(key, jev) as never,
    );
    expect(v).toMatchObject({ decision: "ask", decider: "person" });
    expect(v).not.toHaveProperty("jev");
  });

test("an `ask` that is not a loss, such as `eval`, goes to a person and not to Jev", async () => {
  keepOptions({ decide: "jev" });
  const runs: (readonly string[])[] = [];
  const v = await check(
    'eval "$X"',
    { decision: "allow" },
    jevFake("k", sure, runs) as never,
  );
  expect(v).toMatchObject({ decision: "ask", decider: "person" });
  expect(runs.some((r) => r[0] === "bun")).toBe(false);
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
  clock: { now: async () => 0 },
  fs: {
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
    check("rm notes.md", { decision: "allow" }, $),
    check("rm ./notes.md", { decision: "allow" }, $),
  ]);
  const got = lines(files);
  expect(got.map((l) => l.target).sort()).toStrictEqual([
    "rm ./notes.md",
    "rm notes.md",
  ]);
  expect(
    got.every(
      (l) =>
        l.decider === "person" &&
        l.tool === "Bash" &&
        l.reason.includes("notes.md"),
    ),
  ).toBe(true);
  expect(got[0].at).toBe("1970-01-01T00:00:00.000Z");
});

test("Gate Log: an `ask` that Jev allows has the decider `jev`", async () => {
  keepOptions({ decide: "jev" });
  const files = new Map<string, string>();
  await check(
    "rm notes.md",
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
  expect(await check("rm notes.md", { decision: "allow" }, $)).toMatchObject({
    decision: "ask",
    decider: "person",
  });
});
