import type { Paint } from "./color";
import { type Ctx, type Text, words } from "./ctx";
import {
	bar,
	clock,
	FAR_POINTS,
	FIVE_HOUR_S,
	type Pace,
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
	/** The window's name in `rate_limits`, as `five_hour`. */
	readonly key: string;
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
			: [{ label, key, used, resetsAt: num(window?.["resets_at"]), spanS }];
	});

const timeOf = (sec: number, { now, compact }: Ctx): string =>
	compact ? span(sec * 1000 - now) : clock(sec, now);

/** `12% deficit` as a warning, an error past `FAR_POINTS` points; `8% reserve` as success; `on pace` dim. */
const stageText = ({ delta, stage }: Pace, paint: Paint): string => {
	const points = `${Math.round(Math.abs(delta))}%`;
	if (stage === "on") {
		return paint.dim("on pace");
	}
	if (stage === "reserve") {
		return paint.ok(`${points} reserve`);
	}
	return (delta > FAR_POINTS ? paint.bad : paint.warn)(`${points} deficit`);
};

/** `12% deficit runs out 3:10pm`: CodexBar's pace of a fixed window, and when it runs out at that rate before its reset. */
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
		stageText(pace, paint),
		pace.runOutAt !== undefined &&
			used < 100 &&
			paint.bad(`runs out ${timeOf(pace.runOutAt, ctx)}`)
	);
};

/**
 * The bar of a window: the use before this session started in the fill
 * colour and the use since in Claude's orange, from the baseline the hooks
 * recorded; one colour when none was recorded for this window.
 */
const windowBar = (window: Window, { state, paint }: Ctx): string => {
	const base = state?.limits?.find((item) => item.kind === window.key);
	if (base === undefined) {
		return bar(window.used, paint);
	}
	const before = Math.min(base.before, window.used);
	return bar(window.used, paint, undefined, [
		{ weight: before, style: paint.fill },
		{ weight: window.used - before, style: paint.model }
	]);
};

/** `5h █████░░░░░ 50% 4% deficit ↻2:30pm` for each reported window: use, pace, and reset. */
export const limitTexts = (ctx: Ctx): Text[] =>
	windowsOf(ctx.input).map((window) => {
		const { paint, now } = ctx;
		const { label, used, resetsAt } = window;
		return words(
			paint.dim(label),
			windowBar(window, ctx),
			paint.level(used)(`${wholePercent(used)}%`),
			paceText(window, ctx),
			resetsAt !== undefined &&
				resetsAt * 1000 > now &&
				paint.dim(`↻${timeOf(resetsAt, ctx)}`)
		);
	});
