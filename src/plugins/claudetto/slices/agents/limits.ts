// The bounds of the `agents` slice, in one place.
// Change a bound here and nowhere else.

/** The most words in the final report of an agent. The main session keeps each report to the end. */
export const REPORT_MAX_WORDS = 400;

/**
 * The context of a subagent in tokens, from which the `tool.call` hook tells it to report now.
 * The investigator runs of `research/subagent-usage.md` ended at 110K to 223K tokens.
 */
export const SUBAGENT_CONTEXT_MAX = 100_000;

/**
 * The context of a Haiku 5.5 subagent in tokens, from which the hook tells it to report.
 * Haiku 5.5 costs 5x for each request above 100K prompt tokens, so the bound leaves room for the report turn below that step.
 */
export const HAIKU_CONTEXT_MAX = 85_000;
