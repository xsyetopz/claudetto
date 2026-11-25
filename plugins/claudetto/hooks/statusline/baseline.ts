import type { ContextCategory, SessionRateLimit } from "claude-code";

import type { Baseline, ContextPart } from "./line/state";

/** The windows a baseline is kept for: the fixed ones a pace is drawn for. */
const KINDS: ReadonlySet<string> = new Set(["five_hour", "seven_day"]);

/** A reset time that moved more than this is a new window, not the engine re-rounding the old one. */
const NEW_WINDOW_S = 60;

const secondsOf = (iso: string | undefined): number | undefined => {
	const ms = iso === undefined ? Number.NaN : Date.parse(iso);
	return Number.isFinite(ms) ? Math.round(ms / 1000) : undefined;
};

/**
 * The baselines after a reading at `now` (epoch milliseconds): a window seen
 * first keeps its use as `before`; a window whose reset moved began after the
 * session started, so its `before` is 0; any other window, and one this
 * reading leaves out, keeps its baseline.
 */
export const baselinesAfter = (
	kept: readonly Baseline[],
	limits: readonly SessionRateLimit[],
	now: number
): Baseline[] => [
	...kept.filter((item) => !limits.some((limit) => limit.kind === item.kind)),
	...limits.flatMap((limit) => {
		if (!KINDS.has(limit.kind)) {
			return [];
		}
		const resetsAt = secondsOf(limit.resetsAt);
		const reset = resetsAt === undefined ? {} : { resetsAt };
		const old = kept.find((item) => item.kind === limit.kind);
		if (old === undefined) {
			return [
				{ kind: limit.kind, before: limit.percentUsed, since: now, ...reset }
			];
		}
		const moved =
			old.resetsAt !== undefined &&
			resetsAt !== undefined &&
			Math.abs(resetsAt - old.resetsAt) > NEW_WINDOW_S;
		return [moved ? { ...old, before: 0, ...reset } : old];
	})
];

/** The rows that occupy the window, as /context draws them on its grid: `used` rows, deferred tool schemas left out. */
export const partsOf = (
	categories: readonly ContextCategory[]
): ContextPart[] =>
	categories
		.filter((row) => row.kind === "used" && !row.isDeferred && row.tokens > 0)
		.map((row) => ({ color: row.color, tokens: row.tokens }));
