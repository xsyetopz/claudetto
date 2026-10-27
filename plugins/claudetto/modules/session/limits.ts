// The bounds of the module `session`: the context window, the handoff trigger, the compaction values, and the usage bands.

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
export const CONTEXT_BLOCK_MARGIN = COMPACT_OUTPUT_RESERVE + 3000;

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

export const bandOf = (percent: number): Band => {
	if (percent > USAGE_LEVELS[1]) {
		return "red";
	}
	return percent >= USAGE_LEVELS[0] ? "amber" : "green";
};
