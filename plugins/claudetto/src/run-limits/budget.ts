// The agent's own budget as one short line: the context left and the share of each rate-limit window
// used. Text that reaches the agent every turn is paid for every turn, so the line is the whole
// payload and a reading the login does not supply is left out of it, never printed as zero or unknown.
//
// The line is not sent every turn. `specs/prompt-footprint/spec.md`, "No Per-Message Injection",
// forbids text on every user message and its Quiet Turn scenario asks for no text while the bands
// have not changed, so `budgetBand` coarsens each reading to a step of `BAND` percent and the hook
// sends the line only when that band differs from the one it last sent. The exact percentages stay in
// the text, because the band decides whether to speak and not what to say.

import type { SessionUsage } from "claude-code";

const FULL = 100;

/** The width of one band, in percent. A reading inside the same step is the same band, so it is not worth a turn's tokens to repeat. */
const BAND = 10;

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

/** A reading cut to its band, or `-` for a reading the login does not supply, so an absent reading is one band and not a number. */
const bandOf = (percent: number | undefined): string =>
	percent === undefined ? "-" : String(Math.floor(percent / BAND));

/**
 * The band of `usage`: the three readings each cut to a step of `BAND` percent, joined. Two usages in
 * the same band are worth the same line, so the hook sends nothing for the second.
 */
export const budgetBand = (
	usage: Pick<SessionUsage, "context" | "rateLimits">,
): string =>
	[
		bandOf(usage.context.percent),
		bandOf(used(usage, "five_hour")),
		bandOf(used(usage, "seven_day")),
	].join("/");
