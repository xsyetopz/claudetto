import { apportion } from "../line/format";

/** A view of the usage pane: the context window, or one rate-limit window by its `rate_limits` name. */
export type Tab = "ctx" | "five_hour" | "seven_day";

/** Each view with the label its chip and tab carry and the hotkey that opens it. */
export const TABS: readonly { tab: Tab; label: string; hotkey: string }[] = [
	{ tab: "ctx", label: "ctx", hotkey: "c" },
	{ tab: "five_hour", label: "5h", hotkey: "5" },
	{ tab: "seven_day", label: "7d", hotkey: "7" }
];

/** A run of text in one Claude Code theme key (or the default colour when `color` is absent). */
export interface Run {
	readonly text: string;
	readonly color?: string;
	readonly dim?: true;
}

/** One drawn line of runs. */
export type Line = readonly Run[];

export const run = (text: string, color?: string): Run =>
	color === undefined ? { text } : { text, color };

export const dim = (text: string): Run => ({ text, dim: true });

/** Success below 60 percent, warning below 85, error from 85, as the status line colours a use reading. */
export const levelColor = (percent: number): string => {
	if (percent < 60) {
		return "success";
	}
	return percent < 85 ? "warning" : "error";
};

/** Tokens as `840`, `3.1k` under ten thousand, `14k`, or `1.2M`. */
export const tokensText = (n: number): string => {
	if (n < 1000) {
		return String(Math.round(n));
	}
	if (n < 10_000) {
		return `${(n / 1000).toFixed(1)}k`;
	}
	return n < 1_000_000
		? `${Math.round(n / 1000)}k`
		: `${Number((n / 1_000_000).toFixed(1))}M`;
};

/** A bar part: its weight and the theme key and glyph it draws in. */
export interface Part {
	readonly weight: number;
	readonly color: string;
	readonly glyph?: string;
}

/** `cells` cells split among `parts` by weight; parts that round to no cell are left out. */
export const barRuns = (parts: readonly Part[], cells: number): Run[] =>
	apportion(
		parts.map((part) => part.weight),
		cells
	).flatMap((count, i) => {
		const part = parts[i];
		return part === undefined || count === 0
			? []
			: [run((part.glyph ?? "█").repeat(count), part.color)];
	});

/** A bar of `percent` across `cells`, its filled cells split by `parts` and the rest empty, as the status line draws one. */
export const fillRuns = (
	percent: number,
	parts: readonly Part[],
	cells: number
): Run[] => {
	const filled = Math.min(
		cells,
		Math.max(0, Math.round((percent / 100) * cells))
	);
	const used =
		parts.length === 0 ? [{ weight: 1, color: "rate_limit_fill" }] : parts;
	return [
		...barRuns(used, filled),
		...(filled < cells
			? [run("░".repeat(cells - filled), "rate_limit_empty")]
			: [])
	];
};

/** A window's bar parts: the use before the baseline in the fill colour and the use since in Claude's orange; one part when there is no baseline. */
export const splitOf = (used: number, before: number | undefined) =>
	before === undefined
		? []
		: [
				{ weight: before, color: "rate_limit_fill" },
				{ weight: used - before, color: "claude" }
			];
