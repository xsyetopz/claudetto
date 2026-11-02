import type { SessionUsage } from "claude-code";

const FULL = 100;

const BAND = 10;

const used = (usage: Pick<SessionUsage, "rateLimits">, kind: string) =>
	usage.rateLimits.find((limit) => limit.kind === kind)?.percentUsed;

export const budgetLine = (
	usage: Pick<SessionUsage, "context" | "rateLimits">,
): string | undefined => {
	const { percent } = usage.context;
	const parts = [
		percent === undefined ? undefined : `context ${FULL - percent}% left`,
		...[
			["five-hour", "five_hour"],
			["seven-day", "seven_day"],
		].map(([name, kind]) => {
			const share = used(usage, kind ?? "");
			return share === undefined ? undefined : `${name} ${share}% used`;
		}),
	].filter((part) => part !== undefined);
	return parts.length === 0 ? undefined : `Budget: ${parts.join(", ")}`;
};

/** The seven-day share at which the session is told to spend little of what is left. */
const SLOW_AT = 90;

/** Past `SLOW_AT` the text names the share, so a point moves it; an older share would mislead. */
export const slowText = (
	usage: Pick<SessionUsage, "rateLimits">,
): string | undefined => {
	const share = used(usage, "seven_day");
	return share === undefined || share < SLOW_AT
		? undefined
		: `Seven-day limit: ${share}% used. Start no subagent fan-out and no paid eval run. With each reply that spent more than 1% of the week, say how much of it remains.`;
};

const bandOf = (percent: number | undefined): string =>
	percent === undefined ? "-" : String(Math.floor(percent / BAND));

const weekBand = (percent: number | undefined): string =>
	percent !== undefined && percent >= SLOW_AT
		? String(Math.floor(percent))
		: bandOf(percent);

export const budgetBand = (
	usage: Pick<SessionUsage, "context" | "rateLimits">,
): string =>
	[
		bandOf(usage.context.percent),
		bandOf(used(usage, "five_hour")),
		weekBand(used(usage, "seven_day")),
	].join("/");
