// The hook lab of the `AskUserQuestion` hook of dotclaude-jev.
// The stubs of `process.run` are the test's own, so no client runs and no network call goes out.

import type { On, ProcessRunResult } from "claude-code";
import { type Engine, expect, mock, test } from "claude-code/testing";

type Run = Pick<ProcessRunResult, "exitCode" | "stdout" | "stderr">;

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
  const seen: { question: string }[][] = [];
  on("process.run", (_$, e) => {
    runs.push(e.argv);
    return {
      value: { ...run(), isStdoutTruncated: false, isStderrTruncated: false },
    };
  });
  // The bottom of the chain: it records the question that reaches the user.
  on("tool.call", (_$, e) => {
    if (e.tool === "AskUserQuestion") seen.push(e.questions);
    return { result: "answered" };
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

test("with the key, a facts question shows the pick and the confidence", async ($: Engine, on: On) => {
  const { runs, seen } = stub(on, "k-123", ok(FACTS));
  await ask($);
  expect(runs).toHaveLength(1);
  expect(runs[0]?.[2]).toBe("ask");
  const shown = seen.at(-1)?.[0]?.question;
  expect(shown).toContain("Redis");
  expect(shown).toContain("0.80");
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
