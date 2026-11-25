import type { SessionRateLimit } from "claude-code";

import {
	clock,
	FAR_POINTS,
	FIVE_HOUR_S,
	type Pace,
	paceOf,
	SEVEN_DAY_S,
	span,
	wholePercent
} from "../line/format";
import type { Baseline } from "../line/state";
import {
	dim,
	fillRuns,
	levelColor,
	type Line,
	type Run,
	run,
	splitOf,
	type Tab
} from "./runs";

const SPAN_S: Readonly<Record<Exclude<Tab, "ctx">, number>> = {
	five_hour: FIVE_HOUR_S,
	seven_day: SEVEN_DAY_S
};

/** `7% in deficit` in warning (error past `FAR_POINTS`), `8% in reserve` in success, or `On pace`: CodexBar's words. */
const stageRun = ({ delta, stage }: Pace): Run => {
	const points = `${Math.round(Math.abs(delta))}%`;
	if (stage === "on") {
		return run("On pace", "success");
	}
	if (stage === "reserve") {
		return run(`${points} in reserve`, "success");
	}
	return run(`${points} in deficit`, delta > FAR_POINTS ? "error" : "warning");
};

/** Whether the window runs out before its reset at the rate so far, as CodexBar projects it. */
const outlookOf = (pace: Pace, used: number, now: number): Line => {
	if (used >= 100) {
		return [run("Limit reached", "error")];
	}
	return pace.runOutAt === undefined
		? [dim("Lasts to the reset at this rate")]
		: [run(`Runs out ${when(pace.runOutAt, now)}, before the reset`, "error")];
};

/** The time `sec` as a clock time and a countdown from `now` (epoch milliseconds). */
const when = (sec: number, now: number): string =>
	`${clock(sec, now)} (in ${span(sec * 1000 - now)})`;

/** The legend under a window's bar: its use before the baseline and since it. */
const legendLines = (
	base: Baseline | undefined,
	before: number | undefined,
	used: number,
	now: number
): Line[] =>
	before === undefined || base === undefined
		? []
		: [
				[
					run("█ ", "rate_limit_fill"),
					run(
						`before ${clock(base.since / 1000, now)} ${wholePercent(before)}%   `
					),
					run("█ ", "claude"),
					run(`since then +${wholePercent(used - before)}%`),
					dim("  (every session on the account)")
				]
			];

/** CodexBar's pace with the expected use, then the outlook at this rate. */
const paceLines = (
	pace: Pace | undefined,
	used: number,
	now: number
): Line[] =>
	pace === undefined
		? []
		: [
				[
					stageRun(pace),
					dim(` · expected ${Math.round(pace.expected)}% by now`)
				],
				outlookOf(pace, used, now)
			];

/**
 * One rate-limit window: its use, a bar split into the use before the
 * baseline (fill) and since it (Claude's orange), CodexBar's pace with the
 * expected use, when it runs out at this rate, and when it resets.
 */
export const limitLines = (
	tab: Exclude<Tab, "ctx">,
	limit: SessionRateLimit | undefined,
	base: Baseline | undefined,
	now: number,
	cells: number
): Line[] => {
	const label = tab === "five_hour" ? "5-hour window" : "7-day window";
	if (limit === undefined) {
		return [
			[run(label, "claude")],
			[dim("No reading yet: the window shows after the next API response.")]
		];
	}
	const used = limit.percentUsed;
	const before = base === undefined ? undefined : Math.min(base.before, used);
	const resetsAt =
		limit.resetsAt === undefined
			? Number.NaN
			: Date.parse(limit.resetsAt) / 1000;
	const pace = Number.isFinite(resetsAt)
		? paceOf(used, resetsAt, now / 1000, SPAN_S[tab])
		: undefined;
	return [
		[
			run(`${label} `, "claude"),
			run(`${wholePercent(used)}% used`, levelColor(used))
		],
		fillRuns(used, splitOf(used, before), cells),
		...legendLines(base, before, used, now),
		...paceLines(pace, used, now),
		...(Number.isFinite(resetsAt) && resetsAt * 1000 > now
			? [[dim(`Resets ${when(resetsAt, now)}`)]]
			: [])
	];
};
