// The agent's own budget as one short line: the context left and the share of each rate-limit window
// used. Text that reaches the agent every turn is paid for every turn, so the line is the whole
// payload and a reading the login does not supply is left out of it, never printed as zero or unknown.

import type { SessionUsage } from "claude-code";

const FULL = 100;

const used = (usage: Pick<SessionUsage, "rateLimits">, kind: string) =>
	usage.rateLimits.find((limit) => limit.kind === kind)?.percentUsed;

/**
 * The line for the readings in `usage`, such as `Budget: context 62% left, five-hour 23.5% used,
 * seven-day 41% used`, or none when the login supplies none of the three. The context left is the
 * whole percentage the engine reports, taken from 100.
 */
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
