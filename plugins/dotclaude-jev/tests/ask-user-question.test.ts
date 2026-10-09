// The hook lab of the `AskUserQuestion` hook of dotclaude-jev.
// The stubs of `process.run` are the test's own, so no client runs and no network call goes out.

import { expect, mock, test } from "claude-code/testing";

const QUESTIONS = [
  {
    question: "Which store?",
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

function stub(on: any, key: string, run: () => object) {
  mock.env(on, key ? { TYPESAFE_API_KEY: key } : {});
  const runs: any[] = [];
  const seen: any[] = [];
  on("process.run", (_$: any, e: any) => {
    runs.push(e);
    return { value: run() };
  });
  // The bottom of the chain: it records the question that reaches the user.
  on("tool.call", (_$: any, e: any) => {
    seen.push(e);
    return { result: "answered" };
  });
  return { runs, seen };
}

const ask = ($: any) =>
  $.tool.call({ tool: "AskUserQuestion", questions: QUESTIONS });
const ok = (answers: object) => () => ({
  exitCode: 0,
  stdout: JSON.stringify(answers),
  stderr: "",
});

test("with no key, the question reaches the user unchanged and no client runs", async ($: any, on: any) => {
  const { runs, seen } = stub(on, "", ok(FACTS));
  await ask($);
  expect(runs).toHaveLength(0);
  expect(seen.at(-1).questions).toEqual(QUESTIONS);
});

test("with the key, a facts question shows the pick and the confidence", async ($: any, on: any) => {
  const { runs, seen } = stub(on, "k-123", ok(FACTS));
  await ask($);
  expect(runs).toHaveLength(1);
  expect(runs[0].argv[2]).toBe("ask");
  const shown = seen.at(-1).questions[0].question;
  expect(shown).toContain("Redis");
  expect(shown).toContain("0.80");
});

test("with the key, a preference question stays unchanged", async ($: any, on: any) => {
  const { seen } = stub(
    on,
    "k-123",
    ok({ ...FACTS, kind_0: { choice: "preference", confidence: 0.9 } }),
  );
  await ask($);
  expect(seen.at(-1).questions).toEqual(QUESTIONS);
});

const FAILURES: [string, () => object][] = [
  ["exits with an error", () => ({ exitCode: 1, stdout: "", stderr: "down" })],
  [
    "gives output that is not JSON",
    () => ({ exitCode: 0, stdout: "not json", stderr: "" }),
  ],
];
for (const [name, run] of FAILURES)
  test(`when Jev ${name}, the question reaches the user unchanged`, async ($: any, on: any) => {
    const { seen } = stub(on, "k-123", run);
    await ask($);
    expect(seen.at(-1).questions).toEqual(QUESTIONS);
  });
