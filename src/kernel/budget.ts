// The usage bounds of dotclaude, in one place.
// Tests pin the copies in the agent files to these values,
// so change a bound here and nowhere else.

/**
 * The context window in tokens.
 * The settings snippet sets `CLAUDE_CODE_MAX_CONTEXT_TOKENS` to it,
 * which Claude Code honors only together with `DISABLE_COMPACT=1`.
 * At this size the session stops with `blocking_limit`, and does not compact.
 * The snippet also sets `CLAUDE_CODE_AUTO_COMPACT_WINDOW` to it.
 * Without it, Claude Code 2.1.296 shows and warns against a 200K window for Opus 5.5,
 * because that model is on its "billed past 200K" list.
 */
export const CONTEXT_WINDOW = 300_000;

/**
 * The window in tokens that a status object reports, at most `CONTEXT_WINDOW`.
 * An absent or zero `size` gives `CONTEXT_WINDOW`.
 */
export const windowOf = (size: number | null | undefined): number =>
  Math.min(size || CONTEXT_WINDOW, CONTEXT_WINDOW);

/**
 * The tokens below `CONTEXT_WINDOW` at which the client blocks the next request with `Prompt is too long`:
 * the output reserve of 20K tokens plus 3K tokens (2.1.296 bundle).
 */
export const CONTEXT_BLOCK_MARGIN = 23_000;

/** The status line shows the context in yellow from the first and in red from the second percentage of `CONTEXT_WINDOW`. */
export const USAGE_LEVELS: [number, number] = [75, 90];

/**
 * The characters of a successful `Bash` output that Claude receives inline, the settings key `bashOutputMaxChars`.
 * Claude Code saves a longer output to a file and sends a preview and the path, so no output is lost.
 * 4000 is the lowest value that Claude Code accepts (the 2.1.296 schema clamps to 4000 to 128000).
 */
export const BASH_OUTPUT_MAX_CHARS = 4_000;

/** The characters of the CLI output that a skill command shows with no model turn. A longer output is cut, and a line says how much. */
export const COMMAND_OUTPUT_MAX_CHARS = 20_000;

/** The time for one `gh` call of the policy guard. */
export const POLICY_TIMEOUT_MS = 5_000;

/** The characters of one policy file in the ask prompt. */
export const POLICY_FILE_MAX_CHARS = 2_000;

/**
 * The most characters that `commands` in `src/kernel/shell.ts` reads in one command, with all nested scripts.
 * A longer command is read only in part, and `parse` reports it as `truncated`.
 */
export const SHELL_SCAN_MAX_CHARS = 200_000;

/**
 * The most words of one command that a code reader reads from code in another language.
 * A git command or a write form needs few words, and the bound keeps the cost linear in the length of the code.
 */
export const CODE_COMMAND_MAX_WORDS = 32;
