// The answers of the TypeSafe API, as the CLI prints them for Claude, and as data for the hooks module.
// The API gives the fields of the kind of the question, and `qOf` checks them before any use.

import { MIN_CONFIDENCE, YES_NO_UNSURE_BAND } from "../limits.ts";
import type { Answer } from "../ports.ts";
import { PICK_UNSURE, YES_UNSURE } from "../prompts.ts";

/** The answer of the API to a yes or no question. */
export interface YesNoAnswer {
  readonly noul: number;
}

/** The answer of the API to a question with options. */
export interface PickAnswer {
  readonly choice: string;
  readonly confidence: number;
  readonly probabilities: Record<string, number>;
}

const num = (x: number): string => Number(x).toFixed(2);

const isRecord = (x: unknown): x is Record<string, unknown> =>
  typeof x === "object" && x !== null;

const isProbability = (x: unknown): x is number =>
  typeof x === "number" && x >= 0 && x <= 1;

/** The text of a yes or no answer, with a line when the probability is near one half. */
export const formatYesNo = (a: YesNoAnswer): string => {
  const unsure = Math.abs(a.noul - 0.5) < YES_NO_UNSURE_BAND;
  return `P(yes) = ${num(a.noul)}${unsure ? `\n${YES_UNSURE}` : ""}`;
};

/** The text of a pick answer: the chosen key, the confidence, and the probability of each key, most probable first. */
export const formatPick = (a: PickAnswer): string => {
  const head = `${a.choice} (confidence ${num(a.confidence)})`;
  const rows = Object.entries(a.probabilities)
    .sort((x, y) => y[1] - x[1])
    .map(([k, p]) => `  ${num(p)} ${k}`);
  const low = a.confidence < MIN_CONFIDENCE ? [PICK_UNSURE] : [];
  return [head, ...rows, ...low].join("\n");
};

/**
 * The fields of the answer of the kind `yes` or `pick`, from the `q` field of `answers`.
 * It throws when the reply has no answer of that kind, and the CLI then exits with the failure code.
 */
const qOf = (
  kind: "yes" | "pick",
  answers: unknown,
): YesNoAnswer | PickAnswer => {
  const q = isRecord(answers) ? answers["q"] : undefined;
  if (kind === "yes") {
    if (isRecord(q) && isProbability(q["noul"])) return { noul: q["noul"] };
  } else if (
    isRecord(q) &&
    typeof q["choice"] === "string" &&
    isProbability(q["confidence"]) &&
    isRecord(q["probabilities"])
  ) {
    return {
      choice: q["choice"],
      confidence: q["confidence"],
      probabilities: q["probabilities"] as Record<string, number>,
    };
  }
  throw new Error("The reply of the TypeSafe API has no answer. Try again.");
};

/** The text of the API answer for the kind `yes` or `pick`. */
export const formatAnswer = (
  kind: "yes" | "pick",
  answers: unknown,
): string => {
  const q = qOf(kind, answers);
  return kind === "yes"
    ? formatYesNo(q as YesNoAnswer)
    : formatPick(q as PickAnswer);
};

/** The structured answer of the API for the kind `yes` or `pick`. A yes or no answer picks the side with the higher probability. */
export const answerOf = (kind: "yes" | "pick", answers: unknown): Answer => {
  const q = qOf(kind, answers);
  if (kind === "pick") {
    const pick = q as PickAnswer;
    return { choice: pick.choice, confidence: pick.confidence };
  }
  const { noul } = q as YesNoAnswer;
  return noul >= 0.5
    ? { choice: "yes", confidence: noul }
    : { choice: "no", confidence: 1 - noul };
};
