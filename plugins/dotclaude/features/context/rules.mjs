// The rules of the report-now hook: the context of a subagent from its transcript rows,
// and the message that tells it to report.

import { postToolUse } from "../../lib/hook-io.mjs";
import { parseModel } from "../../lib/model.mjs";
import {
  HAIKU_CONTEXT_MAX,
  REPORT_MAX_WORDS,
  SUBAGENT_CONTEXT_MAX,
} from "./limits.mjs";

/**
 * The tokens of the last request in `rows` (parsed transcript rows), or 0 when no row has usage.
 * The context of a request is its input, cache creation, and cache read tokens.
 */
export function contextTokens(rows) {
  for (let i = rows.length - 1; i >= 0; i--) {
    const u = rows[i]?.message?.usage;
    if (u && typeof u === "object")
      return (
        (u.input_tokens ?? 0) +
        (u.cache_creation_input_tokens ?? 0) +
        (u.cache_read_input_tokens ?? 0)
      );
  }
  return 0;
}

/** The model of the last assistant row in `rows`, or undefined. */
export function modelOf(rows) {
  for (let i = rows.length - 1; i >= 0; i--) {
    const m = rows[i]?.message?.model;
    if (typeof m === "string" && m !== "<synthetic>") return m;
  }
  return undefined;
}

/** The context bound in tokens for a subagent on `model`. */
export function boundFor(model) {
  const m = parseModel(model);
  return m?.family === "haiku" && m.major === 5 && m.minor === 5
    ? HAIKU_CONTEXT_MAX
    : SUBAGENT_CONTEXT_MAX;
}

/**
 * The `PostToolUse` output for a subagent with `tokens` of context, or undefined below the bound.
 * `turnFact` (from `turns.mjs`) adds the turn limit to the same note, so that one note covers both bounds.
 */
export function reportNow(tokens, max = SUBAGENT_CONTEXT_MAX, turnFact) {
  const over = tokens > max;
  if (!over && !turnFact) return undefined;
  const facts = [
    over &&
      `Your context is ${tokens} tokens, which is over the bound of ${max} tokens.`,
    turnFact,
  ].filter(Boolean);
  facts.push(
    `A run that reaches its turn limit returns no report. A report of ${REPORT_MAX_WORDS} words or fewer is due now, with what is done and what stays open.`,
  );
  return postToolUse({ additionalContext: facts.join(" ") });
}
