import type { SessionUsage } from "claude-code";

import { wholePercent } from "../line/format";
import type { Baseline, ContextPart } from "../line/state";
import { fillRuns, levelColor, type Run, run, splitOf, type Tab } from "./runs";

/** A band chip's bar: the context rows recorded at the last measure, or one window's before-and-since split. */
export const chipRuns = (
	tab: Tab,
	usage: SessionUsage,
	context: readonly ContextPart[] | undefined,
	limits: readonly Baseline[] | undefined,
	cells: number
): Run[] | undefined => {
	if (tab === "ctx") {
		const percent = usage.context.percent;
		if (percent === undefined) {
			return undefined;
		}
		const parts = (context ?? []).map((part) => ({
			weight: part.tokens,
			color: part.color
		}));
		return [
			...fillRuns(percent, parts, cells),
			run(` ${wholePercent(percent)}%`, levelColor(percent))
		];
	}
	const limit = usage.rateLimits.find((item) => item.kind === tab);
	if (limit === undefined) {
		return undefined;
	}
	const used = limit.percentUsed;
	const base = limits?.find((item) => item.kind === tab);
	const before = base === undefined ? undefined : Math.min(base.before, used);
	const parts = splitOf(used, before);
	return [
		...fillRuns(used, parts, cells),
		run(` ${wholePercent(used)}%`, levelColor(used))
	];
};
