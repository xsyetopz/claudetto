// The formula is the one the installed `2.1.312` runs, read with `cc-inspect`: `nJ(E, n)` at
// `chunk-r5cyd28m.js:1535742` returns `min(floor(E * pct / 100), E - 13000)` when `pct` parses from
// `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` and is `> 0 && <= 100`, and `E - 13000` otherwise. `E` is the
// effective window, `sQ` at `chunk-r5cyd28m.js:1541928`, which is the window in force less
// `min(maxOutputTokens, XHr)` with `XHr = 20000` at `chunk-r5cyd28m.js:1538038`. The level function
// `EYe` at `chunk-r5cyd28m.js:1535967` blocks the session at `E - 3000`, which is why the window
// itself is a poor way to move the threshold: it moves the block with it.
//
// The trigger of 140,000 is the measured value (`docs/evidence/compaction/threshold.md`), and the
// Haiku trigger of 90,000 holds a Haiku session under the 100,000-token price step.

/** The window claudetto sets for every model but Haiku, in tokens. */
export const CONTEXT_WINDOW = 300_000;

/** The window claudetto sets for Haiku, the smallest `autoCompactWindow` that reaches its trigger. */
export const HAIKU_CONTEXT_WINDOW = 200_000;

/** `XHr`: the largest output reserve the harness subtracts from the window. */
export const COMPACT_OUTPUT_RESERVE = 20_000;

/** The harness's own floor below the effective window, which caps the threshold. */
export const COMPACT_FLOOR_RESERVE = 13_000;

/** Where the handoff is written and the window is cut, in tokens. */
export const HANDOFF_TRIGGER_TOKENS = 140_000;

/** The same for a Haiku session. */
export const HAIKU_HANDOFF_TRIGGER_TOKENS = 90_000;

/** The window less the output reserve, which is the figure the harness's threshold is taken from. */
export const effectiveWindow = (
	window: number,
	maxOutputTokens = COMPACT_OUTPUT_RESERVE,
): number => window - Math.min(maxOutputTokens, COMPACT_OUTPUT_RESERVE);

/**
 * The prompt tokens at which the harness compacts. `pct` is the
 * `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` value; with none, or with one outside `0 < pct <= 100`, the
 * harness uses its own floor alone.
 */
export const compactAt = (
	window: number,
	pct?: number,
	maxOutputTokens = COMPACT_OUTPUT_RESERVE,
): number => {
	const effective = effectiveWindow(window, maxOutputTokens);
	const floor = effective - COMPACT_FLOOR_RESERVE;
	if (pct === undefined || pct <= 0 || pct > 100) {
		return floor;
	}
	return Math.min(Math.floor((effective * pct) / 100), floor);
};

/** How far below the effective window the harness refuses to send a request at all. */
export const BLOCK_RESERVE = 3000;

/** The prompt tokens at which the harness blocks the session instead of compacting it. */
export const blockAt = (
	window: number,
	maxOutputTokens = COMPACT_OUTPUT_RESERVE,
): number => effectiveWindow(window, maxOutputTokens) - BLOCK_RESERVE;

/**
 * The window whose own floor puts the threshold at `trigger` with no percentage set. It is the
 * documented alternative to `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`, and `blockAt` of it shows the cost:
 * a window this small drags the hard block down to just above the trigger.
 */
export const windowForFloor = (trigger: number): number =>
	trigger + COMPACT_FLOOR_RESERVE + COMPACT_OUTPUT_RESERVE;

/** The `pct` that puts the threshold of `window` at `trigger`, truncated to the four decimals the key takes. */
export const pctFor = (window: number, trigger: number): number =>
	Math.floor((trigger / effectiveWindow(window)) * 1e6) / 1e4;

/** The window whose threshold at `pct` is `trigger`, which is how the Haiku window is derived. */
export const windowFor = (trigger: number, pct: number): number =>
	Math.floor(trigger / (pct / 100)) + COMPACT_OUTPUT_RESERVE;

/** The value claudetto writes to `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`. */
export const AUTOCOMPACT_PCT = pctFor(CONTEXT_WINDOW, HANDOFF_TRIGGER_TOKENS);

/** That value as the key takes it, four decimals, because the harness parses the string. */
export const autocompactPctText = (): string => AUTOCOMPACT_PCT.toFixed(4);
