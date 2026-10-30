import { BORROWED } from "./constants.ts";
import type { Row } from "./rows.ts";

export const isCheckStep = (index: number): boolean =>
	index > 0 && index % BORROWED.CHECK_EVERY === 0;

export const isSubAgent = (agentId: string | undefined): boolean =>
	agentId !== undefined;

export const looksToSkipAfter = (n: number): number =>
	n <= BORROWED.TYPED_PAST_FREE
		? 0
		: Math.min(
				BORROWED.LOOKS_TO_SKIP_MAX,
				2 ** (n - BORROWED.TYPED_PAST_FREE - 1),
			);

export interface Counters {
	readonly typedPastInARow: number;
	readonly looksToSkip: number;
}

export const afterIgnored = (typedPastInARow: number): Counters => {
	const n = typedPastInARow + 1;
	return { typedPastInARow: n, looksToSkip: looksToSkipAfter(n) };
};

export const RESET: Counters = { typedPastInARow: 0, looksToSkip: 0 };

/** Surfaces that draw the band above the prompt; the host raises it on these two only. */
const BAND_SURFACES: readonly string[] = ["terminal", "desktop"];

export const drawsBand = (surfaces: readonly string[]): boolean =>
	surfaces.some((s) => BAND_SURFACES.includes(s));

export type Hold =
	| "no-band"
	| "offer-open"
	| "offered-this-turn"
	| "in-flight"
	| "backing-off";

export interface Facts {
	readonly turnId: string;
	readonly surfaces: readonly string[];
	readonly row: Row | undefined;
	readonly inFlight: boolean;
	readonly looksToSkip: number;
}

/** The order is the original's; the caller spends the back-off by one. */
export const holdFor = (f: Facts): Hold | undefined => {
	if (!drawsBand(f.surfaces)) {
		return "no-band";
	}
	if (f.row?.view != null) {
		return "offer-open";
	}
	if (f.row?.offeredTurn === f.turnId) {
		return "offered-this-turn";
	}
	if (f.inFlight) {
		return "in-flight";
	}
	return f.looksToSkip > 0 ? "backing-off" : undefined;
};
