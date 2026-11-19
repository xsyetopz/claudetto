/** The debug check log: one entry per model check, kept three deep. */

import { CHECKS_KEPT } from "../shared/constants";

export const PROPOSED_OUTCOMES = [
	"shown",
	"none",
	"parse_failed",
	"deduped",
	"stale",
	"aborted",
	"api_error",
	"error",
] as const;

export type Outcome = (typeof PROPOSED_OUTCOMES)[number];

export type Check = {
	readonly number: number;
	readonly step: number;
	readonly outcome: Outcome;
	readonly latencyMs: number;
	readonly at: number;
};

/** The fork refusal reasons mapped to the outcome they are logged as. */
export const UNANSWERED_OUTCOMES: Readonly<Record<string, Outcome>> = {
	"nothing-to-fork": "none",
	"api-error": "api_error",
	"empty-reply": "none",
	aborted: "aborted",
};

export const checkLineOf = (c: Check): string =>
	`debug · check ${c.number} · step ${c.step} · ${c.outcome} · ${(c.latencyMs / 1000).toFixed(1)}s · ${new Date(c.at).toTimeString().slice(0, 8)}`;

export function isCheck(value: unknown): value is Check {
	if (typeof value !== "object" || value === null) {
		return false;
	}
	const c = value as Record<string, unknown>;
	return (
		Number.isFinite(c["number"]) &&
		Number.isFinite(c["step"]) &&
		Number.isFinite(c["latencyMs"]) &&
		Number.isFinite(c["at"]) &&
		(PROPOSED_OUTCOMES as readonly unknown[]).includes(c["outcome"])
	);
}

export const checksOf = (value: unknown): Check[] =>
	Array.isArray(value) ? value.filter(isCheck).slice(-CHECKS_KEPT) : [];

export const checksWith = (list: readonly Check[], c: Check): Check[] =>
	[...list, c].slice(-CHECKS_KEPT);
