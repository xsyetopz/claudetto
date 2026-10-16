// The replies that the providers read: the JSON of the CLI with `--json`, and the JSON of the fallback model.
// A reply that does not parse, or that has a choice outside the request, gives no answer.
// The checks are pure, so a test gives each reply as a string.

import type { Answer, DecisionRequest } from "../ports.ts";

/** The text and the structured answer of a parsed reply. */
export interface Parsed {
  readonly text: string;
  readonly answer: Answer;
}

/** The choices of a request: `yes` or `no` for a yes or no question, and the key of each option for a pick. */
export const choicesOf = (request: DecisionRequest): readonly string[] =>
  request.options === undefined
    ? ["yes", "no"]
    : request.options.map((o) => o.key);

const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};

/** The answer in `value`, when its choice is one of `choices` and its confidence is from 0 to 1. */
const answerFrom = (
  value: unknown,
  choices: readonly string[],
): Answer | undefined => {
  const { choice, confidence } = asRecord(value);
  if (typeof choice !== "string" || !choices.includes(choice)) return undefined;
  if (typeof confidence !== "number" || !(confidence >= 0 && confidence <= 1))
    return undefined;
  return { choice, confidence };
};

/** The output of the CLI with `--json`: one object with the `text` and the `answer`. */
export const parseCliOutput = (
  stdout: string,
  request: DecisionRequest,
): Parsed | undefined => {
  const { text, answer } = asRecord(parseJson(stdout.trim()));
  const parsed = answerFrom(answer, choicesOf(request));
  if (typeof text !== "string" || text.trim() === "" || parsed === undefined)
    return undefined;
  return { text: text.trim(), answer: parsed };
};

/** The reply of the fallback model: one JSON object with the `choice`, the `confidence`, and the `reason`. A code fence around it is removed. */
export const parseModelReply = (
  reply: string,
  request: DecisionRequest,
): Parsed | undefined => {
  const bare = reply
    .trim()
    .replace(/^```(?:json)?\s*/, "")
    .replace(/\s*```$/, "");
  const value = parseJson(bare);
  const answer = answerFrom(value, choicesOf(request));
  if (answer === undefined) return undefined;
  const { reason } = asRecord(value);
  const head = `${answer.choice} (confidence ${answer.confidence.toFixed(2)})`;
  const text =
    typeof reason === "string" && reason.trim() !== ""
      ? `${head}\n${reason.trim()}`
      : head;
  return { text, answer };
};
