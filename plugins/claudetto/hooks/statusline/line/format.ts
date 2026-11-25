import type { Paint } from "./color";

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
 * A bar of `cells` cells as Claude Code's `/usage` draws one: filled cells in
 * the theme's `rate_limit_fill`, the rest in `rate_limit_empty`.
 */
export const bar = (percent: number, paint: Paint, cells = CELLS): string => {
	const filled = Math.min(
		cells,
		Math.max(0, Math.round((percent / 100) * cells))
	);
	const full = filled > 0 ? paint.fill("█".repeat(filled)) : "";
	const rest = filled < cells ? paint.empty("░".repeat(cells - filled)) : "";
	return `${full}${rest}`;
};

const MIB = 1024 ** 2;
const GIB = 1024 ** 3;

/** Bytes as `812M` under a gibibyte and `22.4G` from one, in the binary units `ps` and `sysctl` count in. */
export const bytes = (n: number): string =>
	n < GIB ? `${Math.round(n / MIB)}M` : `${(n / GIB).toFixed(1)}G`;

/**
 * The pace of a window at `nowS`: `ratio` is the used percent over the elapsed
 * percent of the window (1 is even use, above 1 runs ahead), `elapsed` the
 * elapsed percent, and `runOutAt` the epoch second the use reaches 100 percent
 * at this rate, set only when that comes before the reset. `undefined` while
 * the window is too young or `resets_at` lies outside it.
 */
export const paceOf = (
	used: number,
	resetsAt: number,
	nowS: number,
	spanS: number
):
	| { ratio: number; elapsed: number; runOutAt: number | undefined }
	| undefined => {
	const left = resetsAt - nowS;
	if (!(left >= 0 && left <= spanS)) {
		return undefined;
	}
	const fraction = (spanS - left) / spanS;
	if (fraction < PACE_MIN_FRACTION) {
		return undefined;
	}
	const runsOut = used > 0 && used < 100 && used / fraction > 100;
	return {
		ratio: used / (100 * fraction),
		elapsed: 100 * fraction,
		runOutAt: runsOut
			? nowS + ((100 - used) * fraction * spanS) / used
			: undefined
	};
};
