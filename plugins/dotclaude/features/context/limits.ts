// The context bounds of dotclaude, in one place.
// Tests pin the copies in the agent files and the hooks to these values, so change a bound here and nowhere else.

/**
 * The context of a subagent in tokens, from which the `PostToolUse` hook tells it to report now.
 * The investigator runs of `research/subagent-usage.md` ended at 110K to 223K tokens.
 */
export const SUBAGENT_CONTEXT_MAX = 100_000;

/**
 * The context of a Haiku 5.5 subagent in tokens, from which the hook tells it to report.
 * Haiku 5.5 costs 5x for each request above 100K prompt tokens, so the bound leaves room for the report turn below that step.
 */
export const HAIKU_CONTEXT_MAX = 85_000;

/**
 * The turns left of a subagent, at which the `PostToolUse` hook tells it to report now.
 * The note comes after a tool call, so with 2 turns left the next turn is the report and the last turn is spare.
 * It must stay below the smallest `maxTurns` of the agent files.
 */
export const TURNS_LEFT_AT = 2;

/** The most words in the final report of an agent. The main session keeps each report to the end. */
export const REPORT_MAX_WORDS = 400;
