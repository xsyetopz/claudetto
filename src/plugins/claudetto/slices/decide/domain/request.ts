// The input of `second_opinion`: the check of each field, and the words of the CLI for a valid request.
// Each error text names the field and tells the model what to give, so the model can call the tool again.

import { MAX_OPTIONS, MIN_OPTIONS } from "../limits.ts";
import type { DecisionRequest, Option } from "../ports.ts";
import {
  ERROR_OPTION_DUPLICATE,
  ERROR_OPTION_INVALID,
  ERROR_OPTIONS_COUNT,
  ERROR_QUESTION_EMPTY,
} from "../prompts.ts";
import { pickWords } from "./picks.ts";

/** The result of `parseInput`: a request, or the error text for the model. */
export type Parsed =
  | { readonly ok: true; readonly request: DecisionRequest }
  | { readonly ok: false; readonly error: string };

/** The check of one option: a `key` with text and no `=`, and a `description` that is a string when given. */
const isOption = (o: unknown): o is Option =>
  typeof o === "object" &&
  o !== null &&
  typeof (o as Option).key === "string" &&
  (o as Option).key !== "" &&
  !(o as Option).key.includes("=") &&
  ((o as Option).description === undefined ||
    typeof (o as Option).description === "string");

/** The request for the tool input, or the error text. The input is what the model sent, so each field is checked. */
export const parseInput = (input: unknown): Parsed => {
  const { question, options, state } = (input ?? {}) as Record<string, unknown>;
  if (typeof question !== "string" || !question.trim())
    return {
      ok: false,
      error: ERROR_QUESTION_EMPTY,
    };
  const request: DecisionRequest = {
    question,
    ...(typeof state === "string" ? { state } : {}),
  };
  if (options === undefined) return { ok: true, request };
  if (
    !Array.isArray(options) ||
    options.length < MIN_OPTIONS ||
    options.length > MAX_OPTIONS
  )
    return {
      ok: false,
      error: ERROR_OPTIONS_COUNT,
    };
  if (!options.every(isOption))
    return {
      ok: false,
      error: ERROR_OPTION_INVALID,
    };
  if (new Set(options.map((o) => o.key)).size !== options.length)
    return {
      ok: false,
      error: ERROR_OPTION_DUPLICATE,
    };
  return { ok: true, request: { ...request, options } };
};

/** The CLI arguments and the stdin of a request. The state goes on stdin, and `--` ends the flags before the words of the model. */
export interface CliCall {
  readonly args: readonly string[];
  readonly stdin: string | undefined;
}

/** The CLI call of a valid request: `yes` for a yes or no question, and `pick` for a question with options. Each call asks for `--json`. */
export const cliCall = (
  request: DecisionRequest,
  random = Math.random,
): CliCall => {
  const stdin = request.state;
  const head =
    stdin === undefined ? ["--json", "--"] : ["--json", "--state", "-", "--"];
  if (request.options === undefined)
    return { args: ["yes", ...head, request.question], stdin };
  return {
    args: [
      "pick",
      ...head,
      request.question,
      ...pickWords(request.options, random),
    ],
    stdin,
  };
};
