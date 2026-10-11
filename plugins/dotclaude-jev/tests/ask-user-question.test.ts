// The hook lab of the `AskUserQuestion` hook of dotclaude-jev.
// The stubs of `process.run` are the test's own, so no client runs and no network call goes out.

import type { On, ProcessRunResult } from "claude-code";
import { type Engine, expect, mock, test } from "claude-code/testing";

type Run = Pick<ProcessRunResult, "exitCode" | "stdout" | "stderr">;
type Question = (typeof QUESTIONS)[number];

const QUESTIONS = [
  {
    question: "Which store?",
    header: "Store",
    multiSelect: false,
    options: [
      { label: "SQLite", description: "A file." },
      { label: "Redis", description: "A server." },
    ],
  },
];
const FACTS = {
  kind_0: { choice: "facts", confidence: 0.9 },
  pick_0: { choice: "Redis", confidence: 0.8 },
};

function stub(on: On, key: string, run: () => Run) {
  mock.env(on, key ? { TYPESAFE_API_KEY: key } : {});
  const runs: (readonly string[])[] = [];
  const seen: Question[][] = [];
  on("process.run", (_$, e) => {
    runs.push(e.argv);
    return {
      value: { ...run(), isStdoutTruncated: false, isStderrTruncated: false },
    };
  });
  // The bottom of the chain: it records the question that reaches the user.
  // As in Claude Code, the user picks the first option, and the answers come back keyed by the question text that the user saw.
  on("tool.call", (_$, e) => {
    if (e.tool !== "AskUserQuestion") return { result: "answered" };
    seen.push(e.questions);
    const answers = Object.fromEntries(
      e.questions.map((q: Question) => [q.question, q.options[0]?.label]),
    );
    return { result: JSON.stringify(answers) };
  });
  return { runs, seen };
}

const ask = ($: Engine) =>
  $.tool.call({ tool: "AskUserQuestion", questions: QUESTIONS });
const ok = (answers: object) => () => ({
  exitCode: 0,
  stdout: JSON.stringify(answers),
  stderr: "",
});

test("with no key, the question reaches the user unchanged and no client runs", async ($: Engine, on: On) => {
  const { runs, seen } = stub(on, "", ok(FACTS));
  await ask($);
  expect(runs).toHaveLength(0);
  expect(seen.at(-1)).toEqual(QUESTIONS);
});

test("with the key, a facts question shows the pick and the confidence in the picked option, and keeps its text", async ($: Engine, on: On) => {
  const { runs, seen } = stub(on, "k-123", ok(FACTS));
  await ask($);
  expect(runs).toHaveLength(1);
  expect(runs[0]?.[3]).toBe("ask");
  const shown = seen.at(-1)?.[0];
  expect(shown?.question).toBe("Which store?");
  expect(shown?.options[0]?.description).toBe("A file.");
  expect(shown?.options[1]?.description).toStartWith("A server. ");
  expect(shown?.options[1]?.description).toContain("0.80");
});

test("with the key, a preference question stays unchanged", async ($: Engine, on: On) => {
  const { seen } = stub(
    on,
    "k-123",
    ok({ ...FACTS, kind_0: { choice: "preference", confidence: 0.9 } }),
  );
  await ask($);
  expect(seen.at(-1)).toEqual(QUESTIONS);
});

test("with the key, the answer of a facts question comes back under the question text that Claude sent", async ($: Engine, on: On) => {
  stub(on, "k-123", ok(FACTS));
  const out = await ask($);
  const answers = JSON.parse(String("result" in out ? out.result : ""));
  expect(Object.keys(answers)).toEqual(["Which store?"]);
});

test("with the key, a multi-select question reaches the user unchanged, and its answers keep their keys", async ($: Engine, on: On) => {
  const multi = QUESTIONS.map((q) => ({ ...q, multiSelect: true }));
  const { seen } = stub(on, "k-123", ok(FACTS));
  const out = await $.tool.call({ tool: "AskUserQuestion", questions: multi });
  expect(seen.at(-1)).toEqual(multi);
  const answers = JSON.parse(String("result" in out ? out.result : ""));
  expect(Object.keys(answers)).toEqual(["Which store?"]);
});

const FAILURES: [string, () => Run][] = [
  ["exits with an error", () => ({ exitCode: 1, stdout: "", stderr: "down" })],
  [
    "gives output that is not JSON",
    () => ({ exitCode: 0, stdout: "not json", stderr: "" }),
  ],
];
FAILURES.push([
  "cannot run",
  () => {
    throw new Error("spawn failed");
  },
]);
for (const [name, run] of FAILURES)
  test(`when Jev ${name}, the question reaches the user unchanged`, async ($: Engine, on: On) => {
    const { seen } = stub(on, "k-123", run);
    await ask($);
    expect(seen.at(-1)).toEqual(QUESTIONS);
  });
