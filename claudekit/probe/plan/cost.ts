import { shareText, weeklyShare } from "./share.ts";

export const FORK_USD = 0.92;

export const BASE_USD = 0.45;

export const ROUND_BUDGET_USD = 26;

export const expectedUsd = (forks: number, bases: number): number =>
	forks * FORK_USD + bases * BASE_USD;

export const costLine = (forks: number, bases: number): string => {
	const usd = expectedUsd(forks, bases);
	return `Expected cost ${usd.toFixed(2)} in the units of total_cost_usd, about ${shareText(weeklyShare(usd))} of the weekly limit.`;
};
