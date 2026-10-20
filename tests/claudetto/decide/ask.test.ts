// The `AskUserQuestion` path (`adapters/ask.ts` and `domain/ask.ts`) with fake CLI runs.
// With every pick over the bound, Jev answers the call. With one pick under it, the dialog stays, and the confident picks go into their options.

import { expect, test } from "bun:test";
import {
  type CliRun,
  judgeQuestions,
} from "../../../plugins/claudetto/slices/decide/adapters/ask.ts";
import {
  type AskQuestion,
  askRequest,
} from "../../../plugins/claudetto/slices/decide/domain/ask.ts";
import type { CliCall } from "../../../plugins/claudetto/slices/decide/domain/request.ts";
import {
  MIN_CONFIDENCE,
  MIN_MARGIN,
} from "../../../plugins/claudetto/slices/decide/limits.ts";

const FACTS: AskQuestion = {
  question: "Which store?",
  options: [
    { label: "sql", description: "relations" },
    { label: "kv", description: "keys" },
  ],
};

const COLOR: AskQuestion = {
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

const answersOf = (pick: string, confidence: number, i = 0) =>
  JSON.stringify({ [`pick_${i}`]: { choice: pick, confidence } });

const both = (a: [string, number], b: [string, number]) =>
  JSON.stringify({
    pick_0: { choice: a[0], confidence: a[1] },
    pick_1: { choice: b[0], confidence: b[1] },
  });

test("a confident pick of the only question answers the call", async () => {
  const { fn, calls } = runWith({ stdout: answersOf("sql", 0.8) });
  const outcome = await judgeQuestions([FACTS], fn);
  expect(outcome).toEqual({
    answered: [{ question: "Which store?", choice: "sql", confidence: 0.8 }],
  });
  expect(calls.length).toBe(1);
  expect(calls[0]?.args).toEqual(["ask"]);
});

test("each question of the call goes to Jev, whatever its kind", async () => {
  const { fn } = runWith({ stdout: both(["sql", 0.9], ["red", 0.9]) });
  const outcome = await judgeQuestions([FACTS, COLOR], fn);
  expect(outcome).toEqual({
    answered: [
      { question: "Which store?", choice: "sql", confidence: 0.9 },
      { question: "Which color?", choice: "red", confidence: 0.9 },
    ],
  });
});

test("the request has one `pick` entry for each question and no kind entry", () => {
  const request = askRequest([FACTS, COLOR]);
  expect(Object.keys(request?.questions ?? {})).toEqual(["pick_0", "pick_1"]);
});

test("a pick under the minimum confidence leaves the question as asked", async () => {
  const { fn } = runWith({ stdout: answersOf("sql", MIN_CONFIDENCE - 0.01) });
  expect(await judgeQuestions([FACTS], fn)).toEqual({ questions: [FACTS] });
});

test("a pick of 2 options at chance plus the margin answers the call", async () => {
  const { fn } = runWith({ stdout: answersOf("sql", 0.5 + MIN_MARGIN) });
  const outcome = await judgeQuestions([FACTS], fn);
  expect(outcome && "answered" in outcome).toBe(true);
});

test("a pick of 2 options at 0.6 stays below the bound", async () => {
  const { fn } = runWith({ stdout: answersOf("sql", 0.6) });
  expect(await judgeQuestions([FACTS], fn)).toEqual({ questions: [FACTS] });
});

test("a pick of 3 options answers at the floor `1/n + MIN_MARGIN` and not under it", async () => {
  const three: AskQuestion = {
    question: "Which store?",
    options: [{ label: "sql" }, { label: "kv" }, { label: "doc" }],
  };
  const floor = Math.max(MIN_CONFIDENCE, 1 / 3 + MIN_MARGIN);
  const over = runWith({ stdout: answersOf("sql", floor + 0.01) });
  expect(await judgeQuestions([three], over.fn)).toHaveProperty("answered");
  const under = runWith({ stdout: answersOf("sql", floor - 0.02) });
  expect(await judgeQuestions([three], under.fn)).toEqual({
    questions: [three],
  });
});

/** The questions of a dialog outcome, or none for an answered call. */
const shownOf = (outcome: Awaited<ReturnType<typeof judgeQuestions>>) =>
  (outcome && "questions" in outcome ? outcome.questions : []) as AskQuestion[];

test("one pick under the bound shows the dialog, with the confident pick in its option", async () => {
  const { fn } = runWith({ stdout: both(["sql", 0.9], ["red", 0.55]) });
  const outcome = await judgeQuestions([FACTS, COLOR], fn);
  expect(outcome).not.toHaveProperty("answered");
  const [first, second] = shownOf(outcome);
  expect(first?.options?.[0]?.description).toMatch(/^relations Jev picks/);
  expect(first?.options?.[1]).toEqual(FACTS.options?.[1]);
  expect(second).toEqual(COLOR);
});

test("a multi-select question goes to the user, and the others keep their picks", async () => {
  const multi: AskQuestion = { ...COLOR, multiSelect: true };
  const { fn, calls } = runWith({ stdout: answersOf("sql", 0.9) });
  const outcome = await judgeQuestions([FACTS, multi], fn);
  expect(outcome).not.toHaveProperty("answered");
  const [first, second] = shownOf(outcome);
  expect(first?.options?.[0]?.description).toMatch(/^relations Jev picks/);
  expect(second).toEqual(multi);
  expect(JSON.parse(calls[0]?.stdin ?? "{}").questions).not.toHaveProperty(
    "pick_1",
  );
});

test("a question with one option or several choices is not sent to Jev", async () => {
  const oneOption: AskQuestion = {
    question: "Continue?",
    options: [{ label: "yes" }],
  };
  const multi: AskQuestion = { ...FACTS, multiSelect: true };
  const { fn, calls } = runWith({});
  expect(await judgeQuestions([oneOption, multi], fn)).toBeUndefined();
  expect(calls.length).toBe(0);
});

const FAILURES: [string, Partial<CliRun>][] = [
  ["a non-zero exit code", { exitCode: 1, stdout: answersOf("sql", 0.9) }],
  ["an output that is not JSON", { stdout: "sql, relations fit" }],
  ["an output that is an array", { stdout: "[]" }],
  ["no answer of the question", { stdout: "{}" }],
  ["a pick that is not an option", { stdout: answersOf("redis", 0.9) }],
];

for (const [name, run] of FAILURES) {
  test(`${name} leaves the question as asked`, async () => {
    const { fn } = runWith(run);
    const outcome = await judgeQuestions([FACTS], fn);
    expect(outcome === undefined || "questions" in outcome).toBe(true);
    if (outcome && "questions" in outcome)
      expect(outcome.questions).toEqual([FACTS]);
  });
}

test("a run that throws leaves the question as asked", async () => {
  const fn = async (): Promise<CliRun> => {
    throw new Error("spawn failed");
  };
  expect(await judgeQuestions([FACTS], fn)).toBeUndefined();
});

test("two questions with the same text go to the dialog, because their answers collide", async () => {
  const { fn } = runWith({ stdout: both(["sql", 0.9], ["sql", 0.9]) });
  const outcome = await judgeQuestions([FACTS, FACTS], fn);
  expect(outcome).not.toHaveProperty("answered");
});
