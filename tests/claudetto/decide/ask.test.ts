// The `AskUserQuestion` path (`adapters/ask.ts` and `domain/ask.ts`) with fake calls of the API.
// With every pick over the bound, Jev answers the call. With one pick under it, the dialog stays, and the confident picks go into their options.

import { expect, test } from "bun:test";
import { MIN_CONFIDENCE } from "../../../plugins/claudetto/kernel/budget.ts";
import { judgeQuestions } from "../../../plugins/claudetto/slices/decide/adapters/ask.ts";
import {
  type AskQuestion,
  askRequest,
} from "../../../plugins/claudetto/slices/decide/domain/ask.ts";
import { APPROVAL_MAX } from "../../../plugins/claudetto/slices/decide/limits.ts";

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

interface CliRun {
  readonly exitCode: number;
  readonly stdout: string;
}

/** A fake call of the API that gives the JSON of `stdout` as the answers, throws when `exitCode` is not 0, and records each request. */
const runWith = (run: Partial<CliRun>) => {
  const calls: { questions: object }[] = [];
  const fn = async (request: { questions: object }): Promise<unknown> => {
    calls.push(request);
    if (run.exitCode) throw new Error("failed");
    return JSON.parse(run.stdout ?? "");
  };
  return { fn, calls };
};

const answersOf = (pick: string, confidence: number, i = 0) =>
  JSON.stringify({
    [`pick_${i}`]: { choice: pick, confidence },
    [`approval_${i}`]: { noul: 0.05 },
  });

const both = (a: [string, number], b: [string, number]) =>
  JSON.stringify({
    pick_0: { choice: a[0], confidence: a[1] },
    pick_1: { choice: b[0], confidence: b[1] },
    approval_0: { noul: 0.05 },
    approval_1: { noul: 0.05 },
  });

test("a confident pick of the only question answers the call", async () => {
  const { fn, calls } = runWith({ stdout: answersOf("sql", 0.8) });
  const outcome = await judgeQuestions([FACTS], fn);
  expect(outcome).toEqual({
    answered: [{ question: "Which store?", choice: "sql", confidence: 0.8 }],
  });
  expect(calls.length).toBe(1);
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

test("the request has a `pick` entry and an approval entry for each question", () => {
  const request = askRequest([FACTS, COLOR]);
  expect(Object.keys(request?.questions ?? {})).toEqual([
    "pick_0",
    "approval_0",
    "pick_1",
    "approval_1",
  ]);
});

test("a pick under the minimum confidence leaves the question as asked", async () => {
  const { fn } = runWith({ stdout: answersOf("sql", MIN_CONFIDENCE - 0.01) });
  expect(await judgeQuestions([FACTS], fn)).toEqual({ questions: [FACTS] });
});

// The floor is `MIN_CONFIDENCE` for any number of options, with no second margin over chance, because `confidence` is measured above chance (`confidence.md`) (the user, 2026-10-23: "follow typesafe's guidelines/best practices").
test("a pick of 2 options at the floor answers the call, and just under it does not", async () => {
  const at = runWith({ stdout: answersOf("sql", MIN_CONFIDENCE) });
  expect(await judgeQuestions([FACTS], at.fn)).toHaveProperty("answered");
  const over = runWith({ stdout: answersOf("sql", MIN_CONFIDENCE + 0.01) });
  expect(await judgeQuestions([FACTS], over.fn)).toHaveProperty("answered");
  const under = runWith({ stdout: answersOf("sql", MIN_CONFIDENCE - 0.01) });
  expect(await judgeQuestions([FACTS], under.fn)).toEqual({
    questions: [FACTS],
  });
});

test("a pick of 3 options has the same floor as a pick of 2", async () => {
  const three: AskQuestion = {
    question: "Which store?",
    options: [{ label: "sql" }, { label: "kv" }, { label: "doc" }],
  };
  const over = runWith({ stdout: answersOf("sql", MIN_CONFIDENCE + 0.01) });
  expect(await judgeQuestions([three], over.fn)).toHaveProperty("answered");
  const under = runWith({ stdout: answersOf("sql", MIN_CONFIDENCE - 0.01) });
  expect(await judgeQuestions([three], under.fn)).toEqual({
    questions: [three],
  });
});

/** The questions of a dialog outcome, or none for an answered call. */
const shownOf = (outcome: Awaited<ReturnType<typeof judgeQuestions>>) =>
  (outcome && "questions" in outcome ? outcome.questions : []) as AskQuestion[];

test("one pick under the bound shows the dialog, with the confident pick in its option", async () => {
  const { fn } = runWith({
    stdout: both(["sql", 0.9], ["red", MIN_CONFIDENCE - 0.01]),
  });
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
  expect(calls[0]?.questions).not.toHaveProperty("pick_1");
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
  const fn = async (): Promise<unknown> => {
    throw new Error("spawn failed");
  };
  expect(await judgeQuestions([FACTS], fn)).toBeUndefined();
});

test("two questions with the same text go to the dialog, because their answers collide", async () => {
  const { fn } = runWith({ stdout: both(["sql", 0.9], ["sql", 0.9]) });
  const outcome = await judgeQuestions([FACTS, FACTS], fn);
  expect(outcome).not.toHaveProperty("answered");
});

/** The reply of Jev with the picks and the `noul` answers (P(yes)) of the approval questions. */
const withApproval = (
  picks: [string, number][],
  approvals: (number | undefined)[],
) =>
  JSON.stringify({
    ...Object.fromEntries(
      picks.map(([choice, confidence], i) => [
        `pick_${i}`,
        { choice, confidence },
      ]),
    ),
    ...Object.fromEntries(
      approvals.flatMap((noul, i) =>
        noul === undefined ? [] : [[`approval_${i}`, { noul }]],
      ),
    ),
  });

test("the request has one `noul` approval entry for each question", () => {
  const request = askRequest([FACTS, COLOR]);
  expect(Object.keys(request?.questions ?? {})).toEqual([
    "pick_0",
    "approval_0",
    "pick_1",
    "approval_1",
  ]);
  const entry = request?.questions["approval_1"] as {
    type: string;
    instructions: string;
  };
  expect(entry.type).toBe("noul");
  expect(entry.instructions).toContain("with no undo");
});

test("an approval no and a sure pick answer the call", async () => {
  const { fn } = runWith({
    stdout: withApproval([["sql", 0.9]], [APPROVAL_MAX - 0.05]),
  });
  expect(await judgeQuestions([FACTS], fn)).toHaveProperty("answered");
});

test("an approval yes at high confidence shows the dialog with no note", async () => {
  const { fn } = runWith({ stdout: withApproval([["sql", 0.95]], [0.95]) });
  const outcome = await judgeQuestions([FACTS], fn);
  expect(outcome).not.toHaveProperty("answered");
  expect(shownOf(outcome)).toEqual([FACTS]);
});

test("an unsure approval shows the dialog", async () => {
  const { fn } = runWith({ stdout: withApproval([["sql", 0.95]], [0.5]) });
  expect(await judgeQuestions([FACTS], fn)).toEqual({ questions: [FACTS] });
});

test("an approval at the bound is unsure and shows the dialog", async () => {
  const { fn } = runWith({
    stdout: withApproval([["sql", 0.95]], [APPROVAL_MAX]),
  });
  expect(await judgeQuestions([FACTS], fn)).toEqual({ questions: [FACTS] });
});

test("a missing approval answer shows the dialog", async () => {
  const { fn } = runWith({
    stdout: withApproval([["sql", 0.95]], [undefined]),
  });
  expect(await judgeQuestions([FACTS], fn)).toEqual({ questions: [FACTS] });
});

test("a call of two questions with one approval shows the dialog and no note on the approval", async () => {
  const { fn } = runWith({
    stdout: withApproval(
      [
        ["sql", 0.9],
        ["red", 0.9],
      ],
      [0.9, 0.05],
    ),
  });
  const outcome = await judgeQuestions([FACTS, COLOR], fn);
  expect(outcome).not.toHaveProperty("answered");
  const [first, second] = shownOf(outcome);
  expect(first).toEqual(FACTS);
  expect(second?.options?.[0]?.description).toMatch(/^warm Jev picks/);
});
