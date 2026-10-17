// The answers of Jev for an `AskUserQuestion` call, with the same questions to Jev as the `decide` slice.
// The hook answers for the user only when each question of the call is a single-select facts question,
// and Jev is sure about its kind and its pick.
// Otherwise the call goes to the user as Claude sent it.

export const API = "https://api.typesafe.ai/v1/systemone";
export const MODEL = "jev-latest";
/** The minimum confidence of Jev for the kind and the pick before the hook answers for the user. */
export const MIN_ANSWER_CONFIDENCE = 0.8;
export const MIN_OPTIONS = 2;
export const ATTEMPT_TIMEOUT_MS = 12_000;

export interface AskOption {
  readonly label: string;
  readonly description?: string;
}

export interface AskQuestion {
  readonly question: string;
  readonly header?: string;
  readonly multiSelect?: boolean;
  readonly options?: readonly AskOption[];
}

export interface Answer {
  readonly choice: string;
  readonly confidence: number;
}

/** The answers of Jev by key, `kind_<i>` for the kind of question `i` and `pick_<i>` for its pick. */
export type AskAnswers = Record<string, Answer | undefined>;

/** The fields that the hook adds to the input: the answers, and a note on each answer. */
export interface Picked {
  readonly answers: Record<string, string>;
  readonly annotations: Record<string, { readonly notes: string }>;
}

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

/** The body of the API request for the questions, or `null` when no question needs Jev. */
export const askBody = (
  questions: readonly AskQuestion[],
): {
  state: string;
  model: string;
  questions: Record<string, unknown>;
} | null => {
  const asked: Record<string, unknown> = {};
  const state: string[] = [];
  questions.forEach((q, i) => {
    const options = q.options ?? [];
    if (options.length < MIN_OPTIONS || q.multiSelect) return;
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
    ? { state: state.join("\n"), model: MODEL, questions: asked }
    : null;
};

/** The answers of the call by question text, when Jev is sure about each question, or `null`. */
export const jevAnswers = (
  questions: readonly AskQuestion[],
  answers: AskAnswers,
): Picked | null => {
  const picked: Picked = { answers: {}, annotations: {} };
  for (const [i, q] of questions.entries()) {
    const kind = answers[`kind_${i}`];
    const pick = answers[`pick_${i}`];
    if (
      q.multiSelect ||
      kind?.choice !== "facts" ||
      !(kind.confidence >= MIN_ANSWER_CONFIDENCE) ||
      pick === undefined ||
      !(pick.confidence >= MIN_ANSWER_CONFIDENCE) ||
      !(q.options ?? []).some((o) => o.label === pick.choice)
    )
      return null;
    picked.answers[q.question] = pick.choice;
    picked.annotations[q.question] = {
      notes: `Jev answered this question for the user (confidence ${pick.confidence.toFixed(2)}). The user did not see it.`,
    };
  }
  return questions.length ? picked : null;
};

/** The answers in the `answers` field of an API reply. An entry that is not an answer is `undefined`. */
export const answersOf = (reply: unknown): AskAnswers => {
  const answers = (reply as { answers?: unknown } | null)?.answers;
  if (typeof answers !== "object" || answers === null) return {};
  return Object.fromEntries(
    Object.entries(answers).map(([key, v]) => {
      const { choice, confidence } = (v ?? {}) as Record<string, unknown>;
      const ok =
        typeof choice === "string" &&
        typeof confidence === "number" &&
        confidence >= 0 &&
        confidence <= 1;
      return [key, ok ? { choice, confidence } : undefined];
    }),
  );
};

/**
 * The `PreToolUse` output that answers the call with no dialog, or `null`.
 * Claude Code takes new `answers` and `annotations` fields, and refuses a change to a shown field (`admitCardAnswer`).
 */
export const hookOutput = (
  input: Record<string, unknown>,
  picked: Picked | null,
) =>
  picked === null || "answers" in input || "annotations" in input
    ? null
    : {
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "allow",
          permissionDecisionReason: "Jev answered the questions.",
          updatedInput: { ...input, ...picked },
        },
      };
