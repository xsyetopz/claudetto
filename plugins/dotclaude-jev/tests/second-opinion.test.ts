// The hook lab of dotclaude-jev: `claude plugin test plugins/dotclaude-jev` loads the hooks module,
// fires `session.start` and `tool.call` events, and stubs each answer of Claude Code.
// No client runs, no session starts, and no network call goes out.
// The stubs of `tool.register` and `process.run` are the test's own, so the live engine is not tested.

import type { On, ProcessRunResult } from "claude-code";
import { type Engine, expect, mock, test } from "claude-code/testing";

import {
  ATTEMPT_TIMEOUT_MS,
  MARGIN_MS,
  TRIES,
  waitMs,
} from "../features/jev/limits.ts";

const TOOL = "mcp__dotclaude-jev__second_opinion";
const OPTIONS = [
  { key: "a", description: "Retry the call." },
  { key: "b", description: "Fail at once." },
  { key: "c", description: "Queue the call." },
];

type Run = Pick<ProcessRunResult, "exitCode" | "stdout" | "stderr">;
type Spawn = {
  argv: readonly string[];
  init?:
    | {
        env?: Readonly<Record<string, string>>;
        stdin?: string;
        timeoutMs?: number;
      }
    | undefined;
};

const START = { cwd: "/work/app", surface: null, isInteractive: false };

/** Stubs for one test: the key, the registered tools, and the runs of the client. */
function stub(
  on: On,
  {
    key = "k-123",
    run,
  }: { key?: string; run?: (argv: readonly string[]) => Run } = {},
) {
  mock.env(on, key ? { TYPESAFE_API_KEY: key } : {});
  on("session.start", () => ({ cwd: "/work/app" }));
  const registered: { name: string; isDeferred?: boolean | undefined }[] = [];
  const runs: Spawn[] = [];
  on("tool.register", (_$, e) => {
    registered.push({ name: e.name, isDeferred: e.isDeferred });
    return { value: { tool: TOOL } };
  });
  on("process.run", (_$, e) => {
    runs.push({ argv: e.argv, init: e.init });
    const answer = run?.(e.argv) ?? {
      exitCode: 0,
      stdout: "a (confidence 0.80)",
      stderr: "",
    };
    return {
      value: { ...answer, isStdoutTruncated: false, isStderrTruncated: false },
    };
  });
  return { registered, runs };
}

const ask = (
  $: Engine,
  input: object = { question: "Which fix?", options: OPTIONS },
) => $.tool.call({ tool: TOOL, ...input });

/** The text of a tool result: a deny or a result that is not text fails the test. */
function resultText(out: Awaited<ReturnType<typeof ask>>): string {
  if (typeof out.result !== "string") {
    throw new Error(`the tool gave no text: ${out.deny ?? out.result}`);
  }
  return out.result;
}

test("with the key, the tool is registered and loaded", async ($: Engine, on: On) => {
  const { registered } = stub(on);
  await $.session.start(START);
  expect(registered).toHaveLength(1);
  expect(registered[0]?.name).toBe("second_opinion");
  expect(registered[0]?.isDeferred).toBe(false);
});

test("without the key, no tool is registered", async ($: Engine, on: On) => {
  const { registered } = stub(on, { key: "" });
  await $.session.start(START);
  expect(registered).toHaveLength(0);
});

test("with the key, the session start gives the engine answer with no text", async ($: Engine, on: On) => {
  stub(on);
  expect(await $.session.start(START)).toEqual({ cwd: "/work/app" });
});

test("a run gets a kill bound that the retries of the client fit under", async ($: Engine, on: On) => {
  const { runs } = stub(on);
  await ask($);
  const timeoutMs = runs[0]?.init?.timeoutMs;
  expect(timeoutMs).toBeGreaterThan(0);
  // The worst case of the client, from the limits of the feature: each try, each wait, and the margin.
  const waits = Array.from({ length: TRIES - 1 }, (_, i) => waitMs(i));
  const worst =
    TRIES * ATTEMPT_TIMEOUT_MS + waits.reduce((a, b) => a + b, 0) + MARGIN_MS;
  expect(worst).toBeLessThanOrEqual(timeoutMs ?? 0);
});

test("with the key, the result has the pick, and the key stays out of the arguments", async ($: Engine, on: On) => {
  const { runs } = stub(on);
  const out = await ask($);
  expect(resultText(out)).toContain("a (confidence 0.80)");
  expect(runs).toHaveLength(1);
  expect(runs[0]?.argv.slice(0, 2)).toEqual(["bun", "--no-env-file"]);
  expect(runs[0]?.argv[2]).toMatch(/features\/jev\/cli\.ts$/);
  expect(runs[0]?.argv[3]).toBe("pick");
  expect(runs[0]?.argv.join(" ")).not.toContain("k-123");
  expect(runs[0]?.init?.env?.["TYPESAFE_API_KEY"]).toBe("k-123");
});

test("a yes or no question without options uses the `yes` verb", async ($: Engine, on: On) => {
  const { runs } = stub(on);
  await ask($, { question: "Does the diff change the API?", state: "diff" });
  expect(runs[0]?.argv.slice(3)).toEqual([
    "yes",
    "--state",
    "-",
    "--",
    "Does the diff change the API?",
  ]);
  expect(runs[0]?.init?.stdin).toBe("diff");
});

test("the state is sent as text and never as a path or a flag", async ($: Engine, on: On) => {
  const { runs } = stub(on);
  await ask($, {
    question: "--state",
    state: ".env",
    options: [
      { key: "--state", description: "/Users/x/.ssh/id_rsa" },
      { key: "b", description: "x" },
    ],
  });
  const argv = runs[0]?.argv.slice(3) ?? [];
  expect(argv.slice(0, 4)).toEqual(["pick", "--state", "-", "--"]);
  expect(argv).not.toContain(".env");
  expect(runs[0]?.init?.stdin).toBe(".env");
  // Every word after `--` is data.
  expect(argv.indexOf("--state", 4)).toBeGreaterThan(3);
});

test("each option comes first in some of the sent questions", async ($: Engine, on: On) => {
  const { runs } = stub(on);
  for (let i = 0; i < 100; i++) await ask($);
  const first = new Set(runs.map((r) => r.argv[6]?.split("=")[0]));
  expect([...first].sort()).toEqual(["a", "b", "c"]);
  for (const r of runs)
    expect(r.argv.slice(6, 9).sort()).toEqual(
      OPTIONS.map((o) => `${o.key}=${o.description}`).sort(),
    );
});

test("when Jev fails, the result names the failure once", async ($: Engine, on: On) => {
  stub(on, {
    run: () => ({ exitCode: 1, stdout: "", stderr: "TypeSafe API 500: down" }),
  });
  const out = await ask($);
  expect(resultText(out).match(/TypeSafe API 500/g)).toHaveLength(1);
});

test("when the client cannot run, the result is not empty", async ($: Engine, on: On) => {
  stub(on, {
    run: () => {
      throw new Error("spawn failed");
    },
  });
  const out = await ask($);
  expect(resultText(out).length).toBeGreaterThan(0);
});

test("with no key, no client runs and the result is not empty", async ($: Engine, on: On) => {
  const { runs } = stub(on, { key: "" });
  const out = await ask($);
  expect(runs).toHaveLength(0);
  expect(resultText(out).length).toBeGreaterThan(0);
});

test("an input that is not valid gets a message and no client run", async ($: Engine, on: On) => {
  const { runs } = stub(on);
  const out = await ask($, {
    question: "Which?",
    options: [{ key: "a=b" }, { key: "c" }],
  });
  expect(resultText(out).length).toBeGreaterThan(0);
  expect(runs).toHaveLength(0);
});
