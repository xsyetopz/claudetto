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

/** The share of the context window in percent, from which the main session gets the notice to finish the current slice (design D32). */
export const CONTEXT_NOTICE_AT = 60;

/**
 * The share of the context window in percent, from which the main session gets the handoff note.
 * It is below the client warning at the window minus 40K tokens, so that a handoff of 20K tokens ends before the client block.
 */
export const CONTEXT_HANDOFF_AT = 80;

/**
 * The tokens below `CONTEXT_WINDOW` at which the client blocks the next request with `Prompt is too long`:
 * the output reserve of 20K tokens plus 3K tokens (2.1.295 bundle).
 */
export const CONTEXT_BLOCK_MARGIN = 23_000;

/**
 * The tokens that the handoff steps need after the last slice.
 * The notice tells the model to stop when the next slice is larger than the tokens left before the client block minus this reserve,
 * because one large read can jump from below `CONTEXT_HANDOFF_AT` to the block (an eval run of 2026-10-09).
 */
export const HANDOFF_RESERVE = 20_000;

/** The most bytes of one level note, so that each note costs few tokens. */
export const NOTE_MAX_BYTES = 2_000;

/** The most characters of one tool result in a subagent run that reads a large file. */
export const RESULT_MAX_CHARS = 8_000;
