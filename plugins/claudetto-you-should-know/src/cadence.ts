// When a check runs and when it is held back: the cadence, the sub-agent pass-through, the skip while
// an offer is open, and the back-off while offers are ignored. All of it is pure, so a test passes in
// plain values (`docs/keep/plugins/you-should-know-design.txt:73-78` and `:127-128`).

import { BORROWED } from "./constants.ts";
import type { Row } from "./rows.ts";

/** A step is a check step when it is not the first and falls on the cadence (`docs/keep/plugins/you-should-know-design.txt:76`). */
export const isCheckStep = (index: number): boolean =>
	index > 0 && index % BORROWED.CHECK_EVERY === 0;

/** A step with an `agentId` belongs to a sub-agent and passes through (`docs/keep/plugins/you-should-know-design.txt:75`). */
export const isSubAgent = (agentId: string | undefined): boolean =>
	agentId !== undefined;

/**
 * Checks to skip after the `n`th ignored offer in a row: none while `n` is within the free count,
 * then a count that doubles with each ignored offer up to a cap (`docs/keep/plugins/you-should-know-design.txt:128`).
 */
export const looksToSkipAfter = (n: number): number =>
	n <= BORROWED.TYPED_PAST_FREE
		? 0
		: Math.min(
				BORROWED.LOOKS_TO_SKIP_MAX,
				2 ** (n - BORROWED.TYPED_PAST_FREE - 1),
			);

/** The back-off state: `typedPastInARow` counts offers ignored in a row, and `looksToSkip` is how many checks to skip before the next offer, from `looksToSkipAfter`. */
export interface Counters {
	readonly typedPastInARow: number;
	readonly looksToSkip: number;
}

/** The counters after one more offer was left to clear by typing past it (`docs/keep/plugins/you-should-know-design.txt:128`). */
export const afterIgnored = (typedPastInARow: number): Counters => {
	const n = typedPastInARow + 1;
	return { typedPastInARow: n, looksToSkip: looksToSkipAfter(n) };
};

/** The counters after an answer: any answer but the timeout of an asked row resets both (`docs/keep/plugins/you-should-know-design.txt:128`). */
export const RESET: Counters = { typedPastInARow: 0, looksToSkip: 0 };

/** Surfaces that draw the band above the prompt; the host raises it on these two only. */
const BAND_SURFACES: readonly string[] = ["terminal", "desktop"];

/** Whether any surface of the session draws the band (`docs/keep/plugins/you-should-know-design.txt:75`). */
export const drawsBand = (surfaces: readonly string[]): boolean =>
	surfaces.some((s) => BAND_SURFACES.includes(s));

/** The reason `holdFor` gives for holding a check back, one value per rule in the order `holdFor` tests them. */
export type Hold =
	| "no-band"
	| "offer-open"
	| "offered-this-turn"
	| "in-flight"
	| "backing-off";

/** What `holdFor` reads: the turn, the surfaces of the session, its row if any, whether a check is in flight, and the back-off count still to spend. */
export interface Facts {
	readonly turnId: string;
	readonly surfaces: readonly string[];
	readonly row: Row | undefined;
	readonly inFlight: boolean;
	readonly looksToSkip: number;
}

/**
 * Why a check on a check step does not run, or nothing when it does. The order is the original's:
 * the band, the open view, the turn that already offered, a check in flight, and last the back-off,
 * which the caller spends by one (`docs/keep/plugins/you-should-know-design.txt:75-78`).
 */
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
