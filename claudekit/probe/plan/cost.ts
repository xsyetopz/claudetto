// The expected cost of a round, sized before any call, in the units of `total_cost_usd`.

import { shareText, weeklyShare } from "./share.ts";

/**
 * A fork, measured rather than scaled: the 6 forks of the smoke round of 2026-10-29 billed 0.45 to 0.84
 * for 18 tasks each, mean 0.59, which is 0.033 a task, and the fixture now leaves a fork 28 tasks
 * (`FORK_NOTES` and the three planted constraints). The cap of a round covers the dispersion, which that
 * round measured at 1.4 times the mean in its dearest fork.
 */
export const FORK_USD = 0.92;

/**
 * A base session, the dearest of the five that have been billed: 0.3603, 0.3721, 0.3892, 0.3921, 0.4066.
 * A 42,000 target reads 7 `notes/` files where 30,000 reads 5, so it is priced one note above the top.
 */
export const BASE_USD = 0.45;

/** The cap on a whole round when `--max-total-usd` is not given: 1.5 times the expected cost of the citable run. */
export const ROUND_BUDGET_USD = 26;

/** The expected cost of `forks` forks and `bases` base sessions. */
export const expectedUsd = (forks: number, bases: number): number =>
	forks * FORK_USD + bases * BASE_USD;

/** The line that states the expected cost before any call, in units and as a share of the weekly limit. */
export const costLine = (forks: number, bases: number): string => {
	const usd = expectedUsd(forks, bases);
	return `Expected cost ${usd.toFixed(2)} in the units of total_cost_usd, about ${shareText(weeklyShare(usd))} of the weekly limit.`;
};
