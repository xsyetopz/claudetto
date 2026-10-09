// The rules of the report-now hook: the context of a subagent from its transcript rows,
// and the message that tells it to report.

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
  return /haiku-5-5/.test(model ?? "")
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
  const text = over
    ? `Your context is ${tokens} tokens, which is over the bound of ${max} tokens. ${turnFact ?? ""} Make no more tool calls except a call that you need for the report. Give your report now in ${REPORT_MAX_WORDS} words or fewer. Include what is done and what stays open, because a run that goes on can reach its turn limit and return no report.`
    : `${turnFact} Start no new tool call. Give your report now in ${REPORT_MAX_WORDS} words or fewer. Include what is done and what stays open.`;
  return {
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext: text.replace(/ {2,}/g, " "),
    },
  };
}

/** True when the value `DISABLE_COMPACT` turns compaction off, with the same test as the `prompt.section` hook. */
export const compactionOff = (value) =>
  Boolean(value) && value !== "0" && value !== "false";
