// The usage bounds of claudetto, in one place. Tests pin the copies in the agent files to these values.

/**
 * The context window in tokens, which the settings snippet sets as `autoCompactWindow` for each model that is not a Haiku model.
 * Without it, Claude Code 2.1.303 and 2.1.304 cap the window of some models, such as Opus 5.5, at 200K, and warns.
 * Claude Code 2.1.305 changed the window resolver, and its cap is not checked live.
 * The env var and the setting still win first.
 */
export const CONTEXT_WINDOW = 300_000;

/** The output reserve that Claude Code takes from the compaction window: `min(maxOutputTokens, 20000)` (2.1.303 to 2.1.305 bundle). */
export const COMPACT_OUTPUT_RESERVE = 20_000;

/** The tokens below `CONTEXT_WINDOW` at which the client blocks the next request: the output reserve plus 3K (2.1.303 bundle). */
export const CONTEXT_BLOCK_MARGIN = COMPACT_OUTPUT_RESERVE + 3_000;

/**
 * The context at which the auto handoff of an Opus, Sonnet, or Fable session starts, below the block limit by the growth of one API call plus the write turn.
 * The client blocks at `CONTEXT_WINDOW` minus `CONTEXT_BLOCK_MARGIN`, which is 277,000 tokens,
 * and the trigger stays below it by the largest growth of one API call plus the cost of the write turn
 * (the handoff spec, "Trigger with a safety margin").
 */
export const HANDOFF_TRIGGER_TOKENS = 225_000;

/** The context at which the auto handoff of a Haiku session starts: 10K below the price step of 100K. */
export const HAIKU_HANDOFF_TRIGGER_TOKENS = 90_000;

/**
 * The value of `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` that gives `HANDOFF_TRIGGER_TOKENS` at `CONTEXT_WINDOW`, rounded down to 4 decimals.
 * Claude Code 2.1.303 to 2.1.305 compact at `min(floor(E * pct / 100), E - 13000)`, with `E` the window less the reserve.
 */
export const AUTOCOMPACT_PCT =
  Math.floor(
    (HANDOFF_TRIGGER_TOKENS / (CONTEXT_WINDOW - COMPACT_OUTPUT_RESERVE)) * 1e6,
  ) / 1e4;

/** The `autoCompactWindow` of a Haiku model: at `AUTOCOMPACT_PCT`, the auto compaction starts below `HAIKU_HANDOFF_TRIGGER_TOKENS`. */
export const HAIKU_AUTOCOMPACT_WINDOW =
  Math.floor(HAIKU_HANDOFF_TRIGGER_TOKENS / (AUTOCOMPACT_PCT / 100)) +
  COMPACT_OUTPUT_RESERVE;

/** The status line shows a use in the warning color from the first and in the limit color from the second percentage. */
export const USAGE_LEVELS: [number, number] = [40, 80];

/** The band of a usage percent: green below the first level of `USAGE_LEVELS`, amber from it to the second, and red above the second. The status line and the usage gate share it. */
export type Band = "green" | "amber" | "red";

export const bandOf = (percent: number): Band =>
  percent > USAGE_LEVELS[1]
    ? "red"
    : percent >= USAGE_LEVELS[0]
      ? "amber"
      : "green";

/** `CLAUDE_CODE_MAX_MCP_DESCRIPTION_LENGTH`: the characters of each MCP tool description and server instruction. */
export const MCP_DESCRIPTION_MAX_CHARS = 2_048;

/** The most characters that `parse` in `kernel/shell.ts` reads in one command with its nested scripts. */
export const SHELL_SCAN_MAX_CHARS = 200_000;

/** The most words that the brace expansion of one word gives. A word that gives more is unreadable. */
export const BRACE_WORDS_MAX = 256;

/** The tries of a rename in `writeAtomic`, the first one included, because a Windows file system can fail a rename for a short time. */
export const RENAME_TRIES = 10;

/** The wait in milliseconds between two tries of a rename in `writeAtomic`. */
export const RENAME_WAIT_MS = 100;

/** The number of tries of a TypeSafe call on a 429 or a 529 reply, the first one included. */
export const TRIES = 3;

/** The first wait before a retry of a TypeSafe call, in milliseconds. Each later wait doubles. */
export const BACKOFF_MS = 1_000;

/** The time of one try of a TypeSafe call, in milliseconds. `HttpInit` has no timeout, so the mod races the call with `$.clock`. */
export const ATTEMPT_TIMEOUT_MS = 12_000;

/** The most characters of a TypeSafe error body that an error keeps. */
export const ERROR_BODY_MAX = 200;

/** The confidence of a `choice` answer under which Jev is not sure: the floor of `confidence.md` ("The 0.5 confidence floor catches anything the model reports as genuinely uncertain"). */
export const MIN_CONFIDENCE = 0.5;

/** The distance from 0.5 under which a yes or no answer says that Jev is not sure: P(yes) from 0.7 is a yes and up to 0.3 is a no (`primitives-noul.md`). */
export const YES_NO_UNSURE_BAND = 0.2;
