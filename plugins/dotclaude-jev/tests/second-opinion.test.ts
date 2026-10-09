// The hook lab of dotclaude-jev: `claude plugin test plugins/dotclaude-jev` loads the hooks module,
// fires `session.start` and `tool.call` events, and stubs each answer of Claude Code.
// No client runs, no session starts, and no network call goes out.
// The stubs of `tool.register` and `process.run` are the test's own, so the live engine is not tested.

import { expect, mock, test } from "claude-code/testing";

const TOOL = "mcp__dotclaude-jev__second_opinion";
const OPTIONS = [
  { key: "a", description: "Retry the call." },
  { key: "b", description: "Fail at once." },
  { key: "c", description: "Queue the call." },
];

type Run = { exitCode: number; stdout: string; stderr: string };

/** Stubs for one test: the key, the registered tools, and the runs of the client. */
function stub(
  on: any,
  { key = "k-123", run }: { key?: string; run?: (argv: string[]) => Run } = {},
) {
  mock.env(on, key ? { TYPESAFE_API_KEY: key } : {});
  on("session.start", () => ({ cwd: "/work/app" }));
  const registered: any[] = [];
  const runs: { argv: string[]; init: any }[] = [];
  on("tool.register", (_$: any, e: any) => {
    registered.push(e);
    return { value: { tool: TOOL } };
  });
  on("process.run", (_$: any, e: any) => {
    runs.push({ argv: e.argv, init: e.init });
    return {
      value: run?.(e.argv) ?? {
        exitCode: 0,
        stdout: "a (confidence 0.80)",
        stderr: "",
      },
    };
  });
  return { registered, runs };
}

const ask = (
  $: any,
  input: object = { question: "Which fix?", options: OPTIONS },
) => $.tool.call({ tool: TOOL, ...input });

test("with the key, the tool is loaded", async ($: any, on: any) => {
  const { registered } = stub(on);
  await $.session.start({ cwd: "/work/app" });
  expect(registered).toHaveLength(1);
  expect(registered[0].name).toBe("second_opinion");
  expect(registered[0].isDeferred).toBe(false);
});

test("without the key, the tool is deferred", async ($: any, on: any) => {
  const { registered } = stub(on, { key: "" });
  await $.session.start({ cwd: "/work/app" });
  expect(registered).toHaveLength(1);
  expect(registered[0].isDeferred).toBe(true);
});

test("with the key, the result has the pick, and the key stays out of the arguments", async ($: any, on: any) => {
  const { runs } = stub(on);
  const out = await ask($);
  expect(out.result).toContain("a (confidence 0.80)");
  expect(runs).toHaveLength(1);
  expect(runs[0].argv[0]).toBe("node");
  expect(runs[0].argv[1]).toMatch(/features\/jev\/cli\.mjs$/);
  expect(runs[0].argv[2]).toBe("pick");
  expect(runs[0].argv.join(" ")).not.toContain("k-123");
  expect(runs[0].init.env.TYPESAFE_API_KEY).toBe("k-123");
});

test("a yes or no question without options uses the `yes` verb", async ($: any, on: any) => {
  const { runs } = stub(on);
  await ask($, { question: "Does the diff change the API?", state: "diff" });
  expect(runs[0].argv.slice(2)).toEqual([
    "yes",
    "--state",
    "-",
    "--",
    "Does the diff change the API?",
  ]);
  expect(runs[0].init.stdin).toBe("diff");
});

test("the state is sent as text and never as a path or a flag", async ($: any, on: any) => {
  const { runs } = stub(on);
  await ask($, {
    question: "--state",
    state: ".env",
    options: [
      { key: "--state", description: "/Users/x/.ssh/id_rsa" },
      { key: "b", description: "x" },
    ],
  });
  const argv = runs[0].argv.slice(2);
  expect(argv.slice(0, 4)).toEqual(["pick", "--state", "-", "--"]);
  expect(argv).not.toContain(".env");
  expect(runs[0].init.stdin).toBe(".env");
  // Every word after `--` is data.
  expect(argv.indexOf("--state", 4)).toBeGreaterThan(3);
});

test("each option comes first in some of the sent questions", async ($: any, on: any) => {
  const { runs } = stub(on);
  for (let i = 0; i < 100; i++) await ask($);
  const first = new Set(runs.map((r) => r.argv[5].split("=")[0]));
  expect([...first].sort()).toEqual(["a", "b", "c"]);
  for (const r of runs)
    expect(r.argv.slice(5, 8).sort()).toEqual(
      OPTIONS.map((o) => `${o.key}=${o.description}`).sort(),
    );
});

test("when Jev fails, the result names the failure once", async ($: any, on: any) => {
  stub(on, {
    run: () => ({ exitCode: 1, stdout: "", stderr: "TypeSafe API 500: down" }),
  });
  const out = await ask($);
  expect(out.result.match(/TypeSafe API 500/g)).toHaveLength(1);
});

test("with no key, no client runs and the result is not empty", async ($: any, on: any) => {
  const { runs } = stub(on, { key: "" });
  const out = await ask($);
  expect(runs).toHaveLength(0);
  expect(out.result.length).toBeGreaterThan(0);
});

test("an input that is not valid gets a message and no client run", async ($: any, on: any) => {
  const { runs } = stub(on);
  const out = await ask($, {
    question: "Which?",
    options: [{ key: "a=b" }, { key: "c" }],
  });
  expect(out.result.length).toBeGreaterThan(0);
  expect(runs).toHaveLength(0);
});
