import type { Paint, Style } from "./color";

/** Seconds in the 5 hour window of `rate_limits.five_hour`. */
export const FIVE_HOUR_S = 18_000;
/** Seconds in the 7 day window of `rate_limits.seven_day`. */
export const SEVEN_DAY_S = 604_800;
/** The part of a window that must pass before a pace shows; earlier, one request swings the ratio. */
const PACE_MIN_FRACTION = 0.03;
/** Cells in a bar. */
const CELLS = 10;

// Some ICU versions put a narrow no-break space (U+202F) before the meridiem, and others a plain space.
const MERIDIAN_GAP = /[\u00A0\u202F ]([AP]M)/iu;
const PATH_SEPARATOR = /[\\/]/u;

/** `12000` as `12k`. */
export const thousands = (n: number): string => `${Math.round(n / 1000)}k`;

/** A context window as `200k` or `1M`. */
export const windowText = (n: number): string =>
	n >= 1_000_000 ? `${Number((n / 1_000_000).toFixed(1))}M` : thousands(n);

/** A duration as `45s`, `12m`, `3h05m`, or `2d4h`. */
export const span = (ms: number): string => {
	const total = Math.max(0, Math.floor(ms / 1000));
	const minutes = Math.floor(total / 60);
	const hours = Math.floor(minutes / 60);
	if (total < 60) {
		return `${total}s`;
	}
	if (minutes < 60) {
		return `${minutes}m`;
	}
	if (hours < 24) {
		return `${hours}h${String(minutes % 60).padStart(2, "0")}m`;
	}
	return `${Math.floor(hours / 24)}d${hours % 24}h`;
};

/** A time in seconds as `1:50pm` within 24 hours of `nowMs`, and as `Oct 19 at 7am` later. */
export const clock = (sec: number, nowMs: number): string => {
	const d = new Date(sec * 1000);
	const time = d
		.toLocaleTimeString("en-US", {
			hour: "numeric",
			minute: d.getMinutes() === 0 ? undefined : "2-digit",
			hour12: true
		})
		.replace(MERIDIAN_GAP, (_, meridiem: string) => meridiem.toLowerCase());
	if (sec * 1000 - nowMs <= 24 * 3_600_000) {
		return time;
	}
	const date: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
	if (d.getFullYear() !== new Date(nowMs).getFullYear()) {
		date.year = "numeric";
	}
	// The date and the time are formatted apart, so the join is the same on every ICU version.
	return `${d.toLocaleDateString("en-US", date)} at ${time}`;
};

/** The last part of a path, for a folder name. */
export const baseName = (dir: string): string =>
	dir.split(PATH_SEPARATOR).findLast(Boolean) ?? dir;

/** Whole percent, with 99 kept for anything under 100 so "100%" shows only when reached. */
export const wholePercent = (n: number): number =>
	n < 100 ? Math.min(Math.round(n), 99) : Math.round(n);

/**
 * `cells` split by `weights` by largest remainder, so the parts always sum
 * to `cells` and each part is within one cell of its exact share.
 */
export const apportion = (
	weights: readonly number[],
	cells: number
): number[] => {
	const total = weights.reduce((sum, w) => sum + Math.max(0, w), 0);
	if (total <= 0 || cells <= 0) {
		return weights.map(() => 0);
	}
	const exact = weights.map((w) => (Math.max(0, w) / total) * cells);
	const parts = exact.map((n) => Math.floor(n));
	const left = cells - parts.reduce((sum, n) => sum + n, 0);
	const order = exact
		.map((n, i) => ({ i, rest: n - Math.floor(n) }))
		.toSorted((a, b) => b.rest - a.rest);
	for (const { i } of order.slice(0, left)) {
		parts[i] = (parts[i] ?? 0) + 1;
	}
	return parts;
};

/** One coloured part of a bar: its share of the filled cells and its style. */
export interface Slice {
	readonly weight: number;
	readonly style: Style;
}

/**
 * A bar of `cells` cells as Claude Code's `/usage` draws one: the filled
 * cells in the theme's `rate_limit_fill`, or split among `slices` by
 * weight when given, and the rest in `rate_limit_empty`.
 */
export const bar = (
	percent: number,
	paint: Paint,
	cells = CELLS,
	slices: readonly Slice[] = []
): string => {
	const filled = Math.min(
		cells,
		Math.max(0, Math.round((percent / 100) * cells))
	);
	const parts =
		slices.length === 0
			? [{ style: paint.fill, count: filled }]
			: apportion(
					slices.map((slice) => slice.weight),
					filled
				).map((count, i) => ({ style: slices[i]?.style ?? paint.fill, count }));
	const full = parts
		.filter(({ count }) => count > 0)
		.map(({ style, count }) => style("█".repeat(count)))
		.join("");
	const rest = filled < cells ? paint.empty("░".repeat(cells - filled)) : "";
	return `${full}${rest}`;
};

const MIB = 1024 ** 2;
const GIB = 1024 ** 3;

/** Bytes as `812M` under a gibibyte and `22.4G` from one, in the binary units `ps` and `sysctl` count in. */
export const bytes = (n: number): string =>
	n < GIB ? `${Math.round(n / MIB)}M` : `${(n / GIB).toFixed(1)}G`;

/** Within this many points of the expected use, a window is on pace (CodexBar's `onTrack` band). */
const ON_PACE_POINTS = 2;
/** Past this many points off pace, a deficit draws as an error (CodexBar's `farAhead` stage). */
export const FAR_POINTS = 12;

/** A window's pace in CodexBar's terms (steipete/CodexBar `UsagePace.swift`). */
export interface Pace {
	/** The percent used by now at an even rate over the window. */
	readonly expected: number;
	/** Used minus expected, in points: above 0 is a deficit, below a reserve. */
	readonly delta: number;
	/** `deficit`, `reserve`, or `on` within two points (rounded to 0 included). */
	readonly stage: "deficit" | "reserve" | "on";
	/** The epoch second use reaches 100 percent at the rate so far; set only when that comes before the reset. */
	readonly runOutAt: number | undefined;
}

/** The side of the expected use a delta off pace lies on. */
const stageOf = (delta: number): "deficit" | "reserve" =>
	delta > 0 ? "deficit" : "reserve";

/**
 * The pace of a window at `nowS`, as CodexBar computes it: the expected use
 * is the elapsed share of the window, the delta is the use above it, and the
 * run-out time extends the rate so far. `undefined` while the window is too
 * young for one request not to swing it, or `resets_at` lies outside it.
 */
export const paceOf = (
	used: number,
	resetsAt: number,
	nowS: number,
	spanS: number
): Pace | undefined => {
	const left = resetsAt - nowS;
	if (!(left > 0 && left <= spanS)) {
		return undefined;
	}
	const elapsedS = spanS - left;
	if (elapsedS / spanS < PACE_MIN_FRACTION) {
		return undefined;
	}
	const actual = Math.min(100, Math.max(0, used));
	const expected = Math.min(100, Math.max(0, (elapsedS / spanS) * 100));
	const delta = actual - expected;
	const near = Math.abs(delta) <= ON_PACE_POINTS || Math.round(delta) === 0;
	const stage = near ? "on" : stageOf(delta);
	const untilEmptyS =
		actual > 0
			? ((100 - actual) * elapsedS) / actual
			: Number.POSITIVE_INFINITY;
	return {
		expected,
		delta,
		stage,
		runOutAt: untilEmptyS < left ? nowS + untilEmptyS : undefined
	};
};
