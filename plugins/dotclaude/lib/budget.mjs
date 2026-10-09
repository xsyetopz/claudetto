// The usage bounds of dotclaude, in one place.
// Tests pin the copies in `features/setup/profile.json` and in the agent files to these values,
// so change a bound here and nowhere else.

/**
 * The context window in tokens.
 * The profile sets `CLAUDE_CODE_MAX_CONTEXT_TOKENS` to it,
 * which Claude Code honors only together with `DISABLE_COMPACT=1`.
 * At this size the session stops with `blocking_limit`, and does not compact.
 * The profile also sets `CLAUDE_CODE_AUTO_COMPACT_WINDOW` to it.
 * Without it, Claude Code 2.1.292 shows and warns against a 200K window for Opus 5.5,
 * because that model is on its "billed past 200K" list.
 */
export const CONTEXT_WINDOW = 300_000;

/** The status line shows the context in yellow from the first and in red from the second percentage of `CONTEXT_WINDOW`. */
export const USAGE_LEVELS = [75, 90];

/**
 * The characters of a successful `Bash` output that Claude receives inline, the profile key `bashOutputMaxChars`.
 * Claude Code saves a longer output to a file and sends a preview and the path, so no output is lost.
 * 4000 is the lowest value that Claude Code accepts (the 2.1.295 schema clamps to 4000 to 128000).
 */
export const BASH_OUTPUT_MAX_CHARS = 4_000;

/** The time for one `gh` call of the policy guard. */
export const POLICY_TIMEOUT_MS = 5_000;

/** The characters of one policy file in the ask prompt. */
export const POLICY_FILE_MAX_CHARS = 2_000;
