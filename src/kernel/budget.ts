// The usage bounds of claudetto, in one place.
// Tests pin the copies in the agent files to these values,
// so change a bound here and nowhere else.

/**
 * The context window in tokens.
 * The settings snippet sets `autoCompactWindow` to it for each model that is not a Haiku model.
 * Without it, Claude Code 2.1.303 caps the window of some models, such as Opus 5.5, at 200K, and warns.
 */
export const CONTEXT_WINDOW = 300_000;

/**
 * The window in tokens that a status object reports, at most `CONTEXT_WINDOW`.
 * A `size` that is absent, not a finite number, or not above zero gives `CONTEXT_WINDOW`.
 */
export const windowOf = (size: number | null | undefined): number =>
  typeof size === "number" && Number.isFinite(size) && size > 0
    ? Math.min(size, CONTEXT_WINDOW)
    : CONTEXT_WINDOW;

/** The output reserve in tokens that Claude Code takes from the compaction window: `min(maxOutputTokens, 20000)` (2.1.303 bundle). */
export const COMPACT_OUTPUT_RESERVE = 20_000;

/**
 * The tokens below `CONTEXT_WINDOW` at which the client blocks the next request with `Prompt is too long`:
 * the output reserve plus 3K tokens (2.1.303 bundle).
 */
export const CONTEXT_BLOCK_MARGIN = COMPACT_OUTPUT_RESERVE + 3_000;

/**
 * The context in tokens at which the auto handoff of an Opus, Sonnet, or Fable session starts.
 * The client blocks at `CONTEXT_WINDOW` minus `CONTEXT_BLOCK_MARGIN`, which is 277,000 tokens,
 * and the trigger stays below it by the largest growth of one API call plus the cost of the write turn
 * (the handoff spec, "Trigger with a safety margin").
 */
export const HANDOFF_TRIGGER_TOKENS = 225_000;

/** The context in tokens at which the auto handoff of a Haiku session starts (the handoff spec, "Trigger with a safety margin"). */
export const HAIKU_HANDOFF_TRIGGER_TOKENS = 100_000;

/**
 * The value of `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`: the percent of the window less `COMPACT_OUTPUT_RESERVE` at which the auto compaction starts.
 * Claude Code 2.1.303 compacts at `min(floor(E * pct / 100), E - 13000)`, with `E` the window less the reserve.
 * At the window `CONTEXT_WINDOW`, the percent gives `HANDOFF_TRIGGER_TOKENS`, rounded down to 4 decimals.
 */
export const AUTOCOMPACT_PCT =
  Math.floor(
    (HANDOFF_TRIGGER_TOKENS / (CONTEXT_WINDOW - COMPACT_OUTPUT_RESERVE)) * 1e6,
  ) / 1e4;

/** The `autoCompactWindow` of a Haiku model: at `AUTOCOMPACT_PCT`, the auto compaction starts below `HAIKU_HANDOFF_TRIGGER_TOKENS`. */
export const HAIKU_AUTOCOMPACT_WINDOW =
  Math.floor(HAIKU_HANDOFF_TRIGGER_TOKENS / (AUTOCOMPACT_PCT / 100)) +
  COMPACT_OUTPUT_RESERVE;

/** The status line shows a use in the warning color from the first and in the limit color from the second percentage. The context of the main session uses the distance to the handoff trigger instead. */
export const USAGE_LEVELS: [number, number] = [75, 90];

/**
 * The characters of a successful `Bash` output that Claude receives inline, the settings key `bashOutputMaxChars`.
 * Claude Code saves a longer output to a file and sends a preview and the path, so no output is lost.
 * The default of Claude Code is 30000, and Claude Code 2.1.303 clamps the value to 4000 to 128000.
 * 16000 brings 196 of 240 saved outputs inline, and it is about 4000 tokens for each result (`bash-output-length.md`).
 */
export const BASH_OUTPUT_MAX_CHARS = 16_000;

/** The characters of the CLI output that a skill command shows with no model turn. A longer output is cut, and a line says how much. */
export const COMMAND_OUTPUT_MAX_CHARS = 20_000;

/**
 * The most characters that `commands` in `src/kernel/shell.ts` reads in one command, with all nested scripts.
 * A longer command is read only in part, and `parse` reports it as `truncated`.
 */
export const SHELL_SCAN_MAX_CHARS = 200_000;

/**
 * The most words that the brace expansion of one word gives in `src/kernel/shell/braces.ts`.
 * A word that gives more is unreadable, so the scan gives `""` for it.
 */
export const BRACE_WORDS_MAX = 256;

/**
 * The most words of one command that a code reader reads from code in another language.
 * A git command or a write form needs few words, and the bound keeps the cost linear in the length of the code.
 */
export const CODE_COMMAND_MAX_WORDS = 32;

/**
 * The tries of a rename in `writeAtomic`, the first one included.
 * On a Windows file system, such as `/mnt/c` on WSL, a rename over a file that another process holds open, such as an antivirus, an indexer, or an editor, can fail for a short time.
 */
export const RENAME_TRIES = 10;

/** The wait in milliseconds between two tries of a rename in `writeAtomic`, so the total wait is short. */
export const RENAME_WAIT_MS = 100;

/** The fewest characters of a value in backticks that the ground check looks for (`handoff-edge-300.md`). */
export const GROUND_VALUE_CHARS_MIN = 4;
