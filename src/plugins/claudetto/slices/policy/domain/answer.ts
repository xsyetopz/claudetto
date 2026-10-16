// The check of a verdict that Claude sends to the tool `ai_policy`, against the files that the gate listed.
// It reads no policy text for meaning. It tests the list of read paths and the quote with exact compares.

import { QUOTE_MIN_CHARS } from "../limits.ts";
import { ERROR_CONDITIONS, ERROR_QUOTE, ERROR_READ } from "../prompts.ts";
import { type PolicyInput, quoteIn } from "./verdict.ts";

/** A listed file: `shown` is the path that Claude reads, and `text` is its content. */
export type Listed = { shown: string; text: string };

/** The error text for an input that does not fit the listed files, or `undefined` when the input fits. */
export const answerError = (
  input: PolicyInput,
  files: readonly Listed[],
): string | undefined => {
  const missing = files.filter((f) => !input.read.includes(f.shown));
  if (missing.length > 0)
    return ERROR_READ({ missing: missing.map((f) => f.shown).join(", ") });
  if (
    input.verdict !== "silent" &&
    !quoteIn(
      input.quote,
      files.map((f) => f.text),
    )
  )
    return ERROR_QUOTE({ min: String(QUOTE_MIN_CHARS) });
  if (input.verdict === "conditions" && input.conditions.trim() === "")
    return ERROR_CONDITIONS;
  return undefined;
};
