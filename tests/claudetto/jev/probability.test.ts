// The check "a number from 0 to 1" has 3 copies: `noulOf` in `domain/jev.ts`, `isProbability` in `domain/answers.ts`, and `asAnswer` in `domain/ask.ts`.
// Each test gives a value of exactly 0, exactly 1, and just outside, and checks the decision of the copy.

import { expect, test } from "bun:test";
import { judgeQuestions } from "../../../plugins/claudetto/modules/jev/adapters/ask.ts";
import {
  answerOf,
  boxOf,
} from "../../../plugins/claudetto/modules/jev/domain/answers.ts";
import { noulOf } from "../../../plugins/claudetto/modules/jev/domain/jev.ts";

const OUTSIDE = [-0.01, 1.01, Number.NaN, "0.5"];

test("`noulOf` keeps a P(yes) of exactly 0 and exactly 1, and drops a value outside 0 to 1", () => {
  const of = (noul: unknown) => noulOf({ q: { noul } }, "q");

  expect(of(0)).toBe(0);
  expect(of(1)).toBe(1);
  for (const value of OUTSIDE) expect(of(value)).toBeUndefined();
});

test("`answerOf` of `yes` takes a P(yes) of 0 as `no` and 1 as `yes`, and throws outside 0 to 1", () => {
  const of = (noul: unknown) => answerOf("yes", { q: { noul } });

  expect(of(0)).toEqual({ choice: "no", confidence: 1 });
  expect(of(1)).toEqual({ choice: "yes", confidence: 1 });
  for (const value of OUTSIDE) expect(() => of(value)).toThrow();
});

test("`answerOf` of `pick` keeps a confidence of 0 and 1, and throws outside 0 to 1", () => {
  const of = (confidence: unknown) =>
    answerOf("pick", {
      q: { choice: "a", confidence, probabilities: { a: 1 } },
    });

  expect(of(0)).toEqual({ choice: "a", confidence: 0 });
  expect(of(1)).toEqual({ choice: "a", confidence: 1 });
  for (const value of OUTSIDE) expect(() => of(value)).toThrow();
});

test("`boxOf` keeps each side and the confidence at 0 and 1, and throws when one is outside 0 to 1", () => {
  const fields = ["top", "bottom", "left", "right", "confidence"] as const;
  const reply = (field: string, value: unknown) => {
    const box: Record<string, unknown> = {
      top: 0.1,
      bottom: 0.5,
      left: 0.2,
      right: 0.7,
    };
    const q: Record<string, unknown> = { box, confidence: 0.9 };
    if (field === "confidence") q["confidence"] = value;
    else box[field] = value;
    return { q };
  };

  for (const field of fields) {
    expect(boxOf(reply(field, 0))[field]).toBe(0);
    expect(boxOf(reply(field, 1))[field]).toBe(1);
    for (const value of OUTSIDE)
      expect(() => boxOf(reply(field, value))).toThrow();
  }
});

const STORE = {
  question: "Which store?",
  options: [{ label: "sql" }, { label: "kv" }],
};

/** `judgeQuestions` with a reply that holds the pick and the approval entry of the one question. */
const judge = (pick: unknown, approval: unknown) =>
  judgeQuestions([STORE], async () => ({
    pick_0: { choice: "sql", confidence: pick },
    approval_0: { noul: approval },
  }));

test("a pick confidence of exactly 1 answers the call, and one above 1 leaves the dialog", async () => {
  expect(await judge(1, 0)).toHaveProperty("answered");
  expect(await judge(1.01, 0)).toEqual({ questions: [STORE] });
});

test("an approval P(yes) of exactly 0 answers the call, and one under 0 leaves the dialog", async () => {
  expect(await judge(0.9, 0)).toHaveProperty("answered");
  expect(await judge(0.9, -0.01)).toEqual({ questions: [STORE] });
});

test("an approval P(yes) or a pick confidence that is no number leaves the dialog", async () => {
  expect(await judge(0.9, "0")).toEqual({ questions: [STORE] });
  expect(await judge("0.9", 0)).toEqual({ questions: [STORE] });
});
