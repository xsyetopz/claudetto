import { shareText, weeklyShare } from "../../price/share.ts";

export const FORK_USD = 0.92;

export const BASE_USD = 0.45;

export const ROUND_BUDGET_USD = 26;

/** The billed tokens of the citable 90k round of 2026-10-30, from its transcripts: the mean of 20 forks, and its base. */
export const FORK_TOKENS = 8_156_977;

export const BASE_TOKENS = 3_450_250;

export const expectedUsd = (forks: number, bases: number): number =>
	forks * FORK_USD + bases * BASE_USD;

export const expectedTokens = (forks: number, bases: number): number =>
	forks * FORK_TOKENS + bases * BASE_TOKENS;

export const costLine = (forks: number, bases: number): string => {
	const usd = expectedUsd(forks, bases);
	const share = shareText(weeklyShare(expectedTokens(forks, bases)));
	return `Expected cost ${usd.toFixed(2)} in the units of total_cost_usd, about ${share} of the weekly limit.`;
};
