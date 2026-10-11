// The answers of TypeSafe Jev, one type for each kind of question, and their text for Claude.

import { MIN_CONFIDENCE, YES_NO_UNSURE_BAND } from "./limits.ts";

const n = (x: unknown) => Number(x).toFixed(2);

/** The answer of the TypeSafe API to a `noul` question. */
export interface NoulAnswer {
  noul: number;
}

/** The answer of the TypeSafe API to a `choice` question. */
export interface ChoiceAnswer {
  choice: string;
  confidence: number;
  probabilities: Record<string, number>;
}

/** The answer of the TypeSafe API to a `score` question. */
export interface ScoreAnswer {
  score: number;
  confidence: number;
  legend: Record<string, string>;
  probabilities: Record<string, number>;
}

/** The rows of the probabilities, most probable first, and the line for a low confidence. */
function tail(
  a: ChoiceAnswer | ScoreAnswer,
  label: (key: string) => string,
): string[] {
  const rows = Object.entries(a.probabilities)
    .sort((x, y) => y[1] - x[1])
    .map(([k, p]) => `  ${n(p)} ${label(k)}`);
  const low =
    a.confidence < MIN_CONFIDENCE
      ? [`The confidence is under ${MIN_CONFIDENCE}, so Jev is not sure.`]
      : [];
  return [...rows, ...low];
}

/** The `noul` answer as short text for Claude. */
export function formatNoul(a: NoulAnswer): string {
  const unsure = Math.abs(a.noul - 0.5) < YES_NO_UNSURE_BAND;
  return `P(yes) = ${n(a.noul)}${unsure ? "\nP(yes) is near 0.5, so Jev is not sure." : ""}`;
}

/** The `choice` answer as short text for Claude. */
export function formatChoice(a: ChoiceAnswer): string {
  const head = `${a.choice} (confidence ${n(a.confidence)})`;
  return [head, ...tail(a, (k) => k)].join("\n");
}

/** The `score` answer as short text for Claude. */
export function formatScore(a: ScoreAnswer): string {
  const head = `score ${n(a.score)} on levels 0 to ${Object.keys(a.legend).length - 1} (confidence ${n(a.confidence)})`;
  return [head, ...tail(a, (k) => `${k} ${a.legend[k]}`)].join("\n");
}

/**
 * The answers of the API as short text for Claude.
 * `answers` is the JSON of the API for a question of `kind`, under the key `q`.
 * The API gives the fields of that kind, so the casts name the type of the kind that was asked.
 */
export function format(kind: string, answers: unknown): string {
  if (kind === "ask") return JSON.stringify(answers, null, 2);
  const { q } = answers as { q: unknown };
  if (kind === "noul") return formatNoul(q as NoulAnswer);
  if (kind === "choice") return formatChoice(q as ChoiceAnswer);
  return formatScore(q as ScoreAnswer);
}
