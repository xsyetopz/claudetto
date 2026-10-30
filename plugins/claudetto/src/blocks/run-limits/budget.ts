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

const bandOf = (percent: number | undefined): string =>
	percent === undefined ? "-" : String(Math.floor(percent / BAND));

export const budgetBand = (
	usage: Pick<SessionUsage, "context" | "rateLimits">,
): string =>
	[
		bandOf(usage.context.percent),
		bandOf(used(usage, "five_hour")),
		bandOf(used(usage, "seven_day")),
	].join("/");
