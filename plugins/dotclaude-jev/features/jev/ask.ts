// The `AskUserQuestion` hook of Jev.
// Jev picks before the user answers a question with options.
// On each `AskUserQuestion`, the hooks module runs the client with `ask` once.
// Jev sorts each question into preference or facts, and picks from its options.
// A facts question shows the pick of Jev and its confidence in the description of the picked option.
// The question text stays as Claude sent it, because the answers come back keyed by that text.
// A multi-select question goes to the user unchanged and not to Jev, because one pick does not answer it.
// A question about a goal, a preference, or an approval stays as it is.
// The hook never denies, so Claude has no reason to ask in plain text instead.
// Without `TYPESAFE_API_KEY`, or when Jev fails, the question passes unchanged.

import { MIN_CONFIDENCE } from "./limits.ts";

const KIND = {
  type: "choice",
  instructions:
    "Only the user can answer some questions. Facts decide others. Which is this question?",
  criteria: {
    preference:
      "A goal, a preference, an approval, or a choice that reasonable engineers make either way",
    facts:
      "Correctness, security, data loss, performance, or maintenance cost decide the answer",
  },
};

/** One option of an `AskUserQuestion` question. */
export interface AskOption {
  label: string;
  description?: string;
}

/** One question of an `AskUserQuestion` call. */
export interface AskQuestion {
  question: string;
  multiSelect?: boolean;
  options?: AskOption[];
}

/** The answer of Jev to one question: the choice, and the confidence. */
export interface JevAnswer {
  choice: string;
  confidence: number;
}

/** The answers of Jev by key, `kind_<i>` and `pick_<i>`. */
export type JevAnswers = Record<string, JevAnswer | undefined>;

/** The Jev request for the single-select questions that have 2 or more options. */
export function jevRequest(questions: AskQuestion[]) {
  const asked: Record<string, unknown> = {};
  const state: string[] = [];
  questions.forEach((q, i) => {
    const options = Array.isArray(q?.options) ? q.options : [];
    if (options.length < 2 || q.multiSelect) return;
    state.push(
      `Question ${i}: ${q.question}`,
      ...options.map((o) => `- ${o.label}: ${o.description ?? ""}`),
    );
    asked[`kind_${i}`] = {
      ...KIND,
      instructions: `${KIND.instructions} (question ${i})`,
    };
    asked[`pick_${i}`] = {
      type: "choice",
      instructions: `Which option is the best answer to question ${i}?`,
      criteria: Object.fromEntries(
        options.map((o) => [o.label, o.description || o.label]),
      ),
    };
  });
  return Object.keys(asked).length
    ? { state: state.join("\n"), questions: asked }
    : null;
}

/** The questions with the pick of Jev added to the picked option of each facts question, with the other fields of each question kept. */
export function withPicks<
  O extends AskOption,
  Q extends AskQuestion & { options?: O[] },
>(questions: Q[], answers: JevAnswers | undefined): Q[] {
  return questions.map((q, i) => {
    const kind = answers?.[`kind_${i}`];
    const pick = answers?.[`pick_${i}`];
    if (
      q.multiSelect ||
      kind?.choice !== "facts" ||
      !(kind.confidence >= MIN_CONFIDENCE) ||
      pick === undefined ||
      !(pick.confidence >= MIN_CONFIDENCE) ||
      !(q.options ?? []).some((o) => o.label === pick.choice)
    )
      return q;
    const note = `Jev picks this option (confidence ${pick.confidence.toFixed(2)}).`;
    return {
      ...q,
      options: (q.options ?? []).map((o) =>
        o.label === pick.choice
          ? {
              ...o,
              description: o.description ? `${o.description} ${note}` : note,
            }
          : o,
      ),
    };
  });
}
