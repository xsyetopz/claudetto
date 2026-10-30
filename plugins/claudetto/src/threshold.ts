// The block sits at `E - 3000`, so moving the window moves the block too; it is a poor threshold lever.

export const CONTEXT_WINDOW = 300_000;

/** The smallest `autoCompactWindow` that reaches Haiku's trigger. */
export const HAIKU_CONTEXT_WINDOW = 200_000;

/** `XHr`: the largest output reserve the harness subtracts from the window. */
export const COMPACT_OUTPUT_RESERVE = 20_000;

/** The harness's own floor below the effective window, which caps the threshold. */
export const COMPACT_FLOOR_RESERVE = 13_000;

export const HANDOFF_TRIGGER_TOKENS = 140_000;

/** Haiku's 90,000 trigger holds a session under the 100,000-token price step. */
export const HAIKU_HANDOFF_TRIGGER_TOKENS = 90_000;

export const effectiveWindow = (
	window: number,
	maxOutputTokens = COMPACT_OUTPUT_RESERVE,
): number => window - Math.min(maxOutputTokens, COMPACT_OUTPUT_RESERVE);

/** A `pct` outside `0 < pct <= 100`, or none, leaves the harness its own floor alone. */
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

export const BLOCK_RESERVE = 3000;

export const blockAt = (
	window: number,
	maxOutputTokens = COMPACT_OUTPUT_RESERVE,
): number => effectiveWindow(window, maxOutputTokens) - BLOCK_RESERVE;

/** A window this small drags the hard block down to just above the trigger. */
export const windowForFloor = (trigger: number): number =>
	trigger + COMPACT_FLOOR_RESERVE + COMPACT_OUTPUT_RESERVE;

/** Truncated to the four decimals the key takes. */
export const pctFor = (window: number, trigger: number): number =>
	Math.floor((trigger / effectiveWindow(window)) * 1e6) / 1e4;

export const windowFor = (trigger: number, pct: number): number =>
	Math.floor(trigger / (pct / 100)) + COMPACT_OUTPUT_RESERVE;

export const AUTOCOMPACT_PCT = pctFor(CONTEXT_WINDOW, HANDOFF_TRIGGER_TOKENS);

/** Four decimals as a string, because the harness parses the string. */
export const autocompactPctText = (): string => AUTOCOMPACT_PCT.toFixed(4);
