// The `AskUserQuestion` path (`adapters/ask.ts` and `domain/ask.ts`) with fake CLI runs.
// A confident pick goes into the option, and every other case leaves the question as Claude sent it.

import { expect, test } from "bun:test";
import { pickQuestions } from "../../../plugins/dotclaude/slices/decide/adapters/ask.ts";
import type { CliRun } from "../../../plugins/dotclaude/slices/decide/adapters/jev.ts";
import type { AskQuestion } from "../../../plugins/dotclaude/slices/decide/domain/ask.ts";
import type { CliCall } from "../../../plugins/dotclaude/slices/decide/domain/request.ts";
import { MIN_CONFIDENCE } from "../../../plugins/dotclaude/slices/decide/limits.ts";

const FACTS: AskQuestion = {
  question: "Which store?",
  options: [
    { label: "sql", description: "relations" },
    { label: "kv", description: "keys" },
  ],
};

const PREFERENCE: AskQuestion = {
  question: "Which color?",
  options: [
    { label: "red", description: "warm" },
    { label: "blue", description: "cool" },
  ],
};

/** A fake CLI run that gives `stdout` and `exitCode`, and records each call. */
const runWith = (run: Partial<CliRun>) => {
  const calls: CliCall[] = [];
  const fn = async (call: CliCall): Promise<CliRun> => {
    calls.push(call);
    return { exitCode: 0, stdout: "", stderr: "", ...run };
  };
  return { fn, calls };
};

const answersOf = (kind: string, pick: string, confidence: number) =>
  JSON.stringify({
    kind_0: { choice: kind, confidence: 0.9 },
    pick_0: { choice: pick, confidence },
  });

test("a confident pick of a facts question goes into the picked option", async () => {
  const { fn, calls } = runWith({
    stdout: answersOf("facts", "sql", 0.8),
  });
  const result = await pickQuestions([FACTS], fn);
  const [q] = result ?? [];
  expect(q?.question).toBe(FACTS.question);
  expect(q?.options?.[0]?.description).toMatch(/^relations /);
  expect(q?.options?.[1]).toEqual(FACTS.options?.[1]);
  expect(calls.length).toBe(1);
  expect(calls[0]?.args).toEqual(["ask"]);
});

test("a pick under the minimum confidence leaves the question as asked", async () => {
  const { fn } = runWith({
    stdout: answersOf("facts", "sql", MIN_CONFIDENCE - 0.01),
  });
  expect(await pickQuestions([FACTS], fn)).toEqual([FACTS]);
});

test("a pick at the minimum confidence goes into the option", async () => {
  const { fn } = runWith({
    stdout: answersOf("facts", "sql", MIN_CONFIDENCE),
  });
  const [q] = (await pickQuestions([FACTS], fn)) ?? [];
  expect(q?.options?.[0]?.description).toMatch(/^relations /);
});

test("a preference question is not picked, so Jev gives no pick for it", async () => {
  const { fn } = runWith({
    stdout: answersOf("preference", "red", 0.99),
  });
  expect(await pickQuestions([PREFERENCE], fn)).toEqual([PREFERENCE]);
});

test("a question with one option or several choices is not sent to Jev", async () => {
  const oneOption: AskQuestion = {
    question: "Continue?",
    options: [{ label: "yes" }],
  };
  const multi: AskQuestion = { ...FACTS, multiSelect: true };
  const { fn, calls } = runWith({});
  expect(await pickQuestions([oneOption, multi], fn)).toBeUndefined();
  expect(calls.length).toBe(0);
});

const FAILURES: [string, Partial<CliRun>][] = [
  [
    "a non-zero exit code",
    { exitCode: 1, stdout: answersOf("facts", "sql", 0.9) },
  ],
  ["an output that is not JSON", { stdout: "sql, relations fit" }],
  ["an output that is an array", { stdout: "[]" }],
  ["no answer of the question", { stdout: "{}" }],
  [
    "a pick that is not an option",
    { stdout: answersOf("facts", "redis", 0.9) },
  ],
];

for (const [name, run] of FAILURES) {
  test(`${name} leaves the question as asked`, async () => {
    const { fn } = runWith(run);
    const result = await pickQuestions([FACTS], fn);
    expect(result ?? [FACTS]).toEqual([FACTS]);
  });
}

test("a run that throws leaves the question as asked", async () => {
  const fn = async (): Promise<CliRun> => {
    throw new Error("spawn failed");
  };
  expect(await pickQuestions([FACTS], fn)).toBeUndefined();
});
