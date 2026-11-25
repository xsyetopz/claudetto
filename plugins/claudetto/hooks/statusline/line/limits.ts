import type { Paint, Style } from "./color";
import { type Ctx, type Text, words } from "./ctx";
import {
	bar,
	clock,
	FIVE_HOUR_S,
	paceOf,
	SEVEN_DAY_S,
	span,
	wholePercent
} from "./format";
import { num, type Rec, sub } from "./input";

/** The windows `rate_limits` reports, with the seconds each spans; spend has no fixed span. */
const WINDOWS: readonly [label: string, key: string, spanS?: number][] = [
	["5h", "five_hour", FIVE_HOUR_S],
	["7d", "seven_day", SEVEN_DAY_S],
	["spend", "spend_limit"]
];

interface Window {
	readonly label: string;
	readonly used: number;
	readonly resetsAt: number | undefined;
	readonly spanS: number | undefined;
}

/** The windows with a reported `used_percentage`; a window the engine leaves out is left out here too. */
export const windowsOf = (input: Rec): Window[] =>
	WINDOWS.flatMap(([label, key, spanS]) => {
		const window = sub(sub(input, "rate_limits"), key);
		const used = num(window?.["used_percentage"]);
		return used === undefined
			? []
			: [{ label, used, resetsAt: num(window?.["resets_at"]), spanS }];
	});

const timeOf = (sec: number, { now, compact }: Ctx): string =>
	compact ? span(sec * 1000 - now) : clock(sec, now);

/** Success at an even pace or under, warning up to 30 percent ahead, error beyond. */
const paceStyle = (ratio: number, paint: Paint): Style => {
	if (ratio <= 1) {
		return paint.ok;
	}
	return ratio <= 1.3 ? paint.warn : paint.bad;
};

/** `1.2x runs out 3:10pm`: the pace of a fixed window, and when it runs out at that pace before its reset. */
const paceText = (window: Window, ctx: Ctx): Text => {
	const { used, resetsAt, spanS } = window;
	if (spanS === undefined || resetsAt === undefined) {
		return undefined;
	}
	const pace = paceOf(used, resetsAt, ctx.now / 1000, spanS);
	if (pace === undefined) {
		return undefined;
	}
	const { paint } = ctx;
	return words(
		paceStyle(pace.ratio, paint)(`${pace.ratio.toFixed(1)}x`),
		pace.runOutAt !== undefined &&
			paint.bad(`runs out ${timeOf(pace.runOutAt, ctx)}`)
	);
};

/** `5h █████░░░░░ 50% 1.0x ↻2:30pm` for each reported window: use, pace, and reset. */
export const limitTexts = (ctx: Ctx): Text[] =>
	windowsOf(ctx.input).map((window) => {
		const { paint, now } = ctx;
		const { label, used, resetsAt } = window;
		return words(
			paint.dim(label),
			bar(used, paint),
			paint.level(used)(`${wholePercent(used)}%`),
			paceText(window, ctx),
			resetsAt !== undefined &&
				resetsAt * 1000 > now &&
				paint.dim(`↻${timeOf(resetsAt, ctx)}`)
		);
	});
