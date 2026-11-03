// `2.1.317`: `R5e()` blocks at the effective window less `3000`, so moving the window moves the block too; it is a poor threshold lever.

export const CONTEXT_WINDOW = 300_000;

/** The Haiku window at the shared percentage: `windowFor(90_000, 50)`. `windowForFloor(90_000)` is 123,000, but it holds only when no percentage is set. */
export const HAIKU_CONTEXT_WINDOW = 200_000;

/** `2.1.317`: `Ree()` subtracts `Math.min(maxOutputTokens, pVr)` from the window, and `pVr` is `20000` in the bundle. */
export const COMPACT_OUTPUT_RESERVE = 20_000;

/** `2.1.317`: `PZ()` returns the effective window less `13000`, and the percentage can only lower it. */
export const COMPACT_FLOOR_RESERVE = 13_000;

export const HANDOFF_TRIGGER_TOKENS = 140_000;

/** Haiku's 90,000 trigger holds a session under the 100,000-token price step. */
export const HAIKU_HANDOFF_TRIGGER_TOKENS = 90_000;

export const effectiveWindow = (
	window: number,
	maxOutputTokens = COMPACT_OUTPUT_RESERVE,
): number => window - Math.min(maxOutputTokens, COMPACT_OUTPUT_RESERVE);

/** `2.1.317`: `PZ()` takes a percentage only when `0 < pct <= 100`; any other leaves its own floor alone. */
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

/** `2.1.317`: `R5e()` blocks at `effectiveWindow - 3000`. */
export const BLOCK_RESERVE = 3000;

export const blockAt = (
	window: number,
	maxOutputTokens = COMPACT_OUTPUT_RESERVE,
): number => effectiveWindow(window, maxOutputTokens) - BLOCK_RESERVE;

/** A window this small drags the hard block down to just above the trigger. */
export const windowForFloor = (trigger: number): number =>
	trigger + COMPACT_FLOOR_RESERVE + COMPACT_OUTPUT_RESERVE;

/** Truncated to four decimals. */
export const pctFor = (window: number, trigger: number): number =>
	Math.floor((trigger / effectiveWindow(window)) * 1e6) / 1e4;

export const windowFor = (trigger: number, pct: number): number =>
	Math.floor(trigger / (pct / 100)) + COMPACT_OUTPUT_RESERVE;

export const AUTOCOMPACT_PCT = pctFor(CONTEXT_WINDOW, HANDOFF_TRIGGER_TOKENS);

/** Four decimals are the author's choice; `2.1.317` reads the env value with `parseFloat`. */
export const autocompactPctText = (): string => AUTOCOMPACT_PCT.toFixed(4);
