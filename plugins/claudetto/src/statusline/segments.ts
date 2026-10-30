import type { Paint } from "./color.ts";
import {
	baseName,
	clock,
	type LimitWindow,
	paceOf,
	span,
	thousands,
	windowText,
} from "./format.ts";
import { ICON } from "./icons.ts";
import { num, type Rec, str, sub } from "./input.ts";
import { FIVE_HOUR_S, SEVEN_DAY_S } from "./limits.ts";

/** What a segment reads: the input, the palette, the clock in milliseconds, and `compact`, which swaps clock times for countdowns. */
export interface Ctx {
	input: Rec;
	paint: Paint;
	now: number;
	compact: boolean;
}

export type Text = string | undefined;

const LIMITS = ["five_hour", "seven_day"] as const;

export const folderText = ({ input, paint }: Ctx): Text => {
	const dir =
		str(sub(input, "workspace")?.["current_dir"]) ?? str(input["cwd"]);
	return dir ? paint.bold(`${ICON.folder} ${baseName(dir)}`) : undefined;
};

/** The branch of a worktree session. A plain checkout reports none on stdin, and asking `git` is a child process. */
export const branchText = ({ input, paint }: Ctx): Text => {
	const name = str(sub(input, "worktree")?.["branch"]);
	return name ? paint.branch(`${ICON.branch} ${name}`) : undefined;
};

/** `⇄ #12 approved`, or `!12` for a GitLab merge request, in the color of the review state. */
export const prText = ({ input, paint }: Ctx): Text => {
	const request = sub(input, "pr");
	const number = num(request?.["number"]);
	if (number === undefined) {
		return undefined;
	}
	const state = str(request?.["review_state"]);
	const mark = request?.["kind"] === "mr" ? "!" : "#";
	return paint.review(state)(
		`${ICON.pr} ${mark}${number}${state ? ` ${state}` : ""}`,
	);
};

/** The model, its effort, and a labeled mark for each of thinking and fast mode. */
export const modelText = ({ input, paint }: Ctx): Text => {
	const model = sub(input, "model");
	const name = str(model?.["display_name"]) ?? str(model?.["id"]);
	if (!name) {
		return undefined;
	}
	const effort = str(sub(input, "effort")?.["level"]);
	return [
		paint.model(`${ICON.model} ${name}`),
		effort ? paint.dim(effort) : "",
		sub(input, "thinking")?.["enabled"] === true ? paint.dim("think") : "",
		input["fast_mode"] === true ? paint.warn("fast") : "",
	]
		.filter(Boolean)
		.join(" ");
};

/** `◫ ctx 40% of 200k`, with the percent in the usage gradient. */
export const contextText = ({ input, paint }: Ctx): Text => {
	const window = sub(input, "context_window");
	const used = num(window?.["used_percentage"]);
	if (used === undefined) {
		return undefined;
	}
	const size = num(window?.["context_window_size"]);
	const percent = Math.round(used);
	return [
		paint.dim(`${ICON.context} ctx`),
		paint.level(percent)(`${percent}%`),
		size ? paint.dim(`of ${windowText(size)}`) : "",
	]
		.filter(Boolean)
		.join(" ");
};

/** The dollars are a client-side list price, so a login that reports a subscription window did not pay them. */
const onSubscription = (input: Rec): boolean =>
	LIMITS.some((key) => sub(sub(input, "rate_limits"), key) !== undefined);

export const costText = ({ input, paint }: Ctx): Text => {
	const cost = sub(input, "cost");
	const usd = num(cost?.["total_cost_usd"]);
	const added = num(cost?.["total_lines_added"]) ?? 0;
	const removed = num(cost?.["total_lines_removed"]) ?? 0;
	const money =
		usd === undefined || onSubscription(input)
			? ""
			: paint.dim(`$${usd.toFixed(2)}`);
	const lines =
		added || removed
			? `${paint.ok(`+${added}`)} ${paint.limit(`-${removed}`)}`
			: "";
	return [money, lines].filter(Boolean).join(" ") || undefined;
};

const arrowText = (paint: Paint, delta: number): string => {
	if (delta < 0) {
		return paint.ok(`${ICON.reserve}${-delta}%`);
	}
	return delta > 0 ? paint.warn(`${ICON.deficit}${delta}%`) : "";
};

const moneyText = (paint: Paint, window: LimitWindow): string => {
	const { used_usd: usd, limit_usd: cap, period } = window;
	return typeof usd === "number" && typeof cap === "number"
		? paint.dim(
				`$${Math.round(usd)}/$${Math.round(cap)}${period ? ` ${period}` : ""}`,
			)
		: "";
};

/** `◷ 5h 23% ⇣13% ⏵3:10pm ↻1:50pm`: the reserve or deficit, the projected run-out, and the reset. A window with no `spanS` has a dim reset and no pace. */
const limitText = (
	label: string,
	window: LimitWindow,
	spanS: number | undefined,
	{ paint, now, compact }: Ctx,
): Text => {
	const used = num(window.used_percentage);
	if (used === undefined) {
		return undefined;
	}
	const percent = Math.round(used);
	const nowS = now / 1000;
	const pace = spanS === undefined ? undefined : paceOf(window, nowS, spanS);
	const timeOf = (sec: number) =>
		compact ? span(sec * 1000 - now) : clock(sec, now);
	const resetsAt = num(window.resets_at) ?? 0;
	const runOutAt = pace?.runOutAt;
	const runOut =
		runOutAt === undefined
			? ""
			: paint.runout((runOutAt - nowS) / (resetsAt - nowS))(
					`${ICON.runout}${timeOf(runOutAt)}`,
				);
	const resetStyle =
		spanS === undefined
			? paint.dim
			: paint.level(((resetsAt - nowS) / spanS) * 100);
	const reset =
		resetsAt * 1000 > now ? resetStyle(`${ICON.reset}${timeOf(resetsAt)}`) : "";
	return [
		`${ICON.limit} ${paint.dim(label)} ${paint.level(percent)(`${percent}%`)}`,
		moneyText(paint, window),
		arrowText(paint, pace?.delta ?? 0),
		runOut,
		reset,
	]
		.filter(Boolean)
		.join(" ");
};

const windowOf = (window: Rec): LimitWindow => ({
	used_percentage: num(window["used_percentage"]),
	resets_at: num(window["resets_at"]),
	used_usd: num(window["used_usd"]),
	limit_usd: num(window["limit_usd"]),
	period: str(window["period"]),
});

const LIMIT_ROWS: readonly [string, string, number | undefined][] = [
	["5h", "five_hour", FIVE_HOUR_S],
	["7d", "seven_day", SEVEN_DAY_S],
	["spend", "spend_limit", undefined],
];

/** One text per reported window, in the order 5h, 7d, spend. A window the API leaves out is left out here too. */
export const limitTexts = (ctx: Ctx): Text[] =>
	LIMIT_ROWS.map(([label, key, spanS]) => {
		const window = sub(sub(ctx.input, "rate_limits"), key);
		return window ? limitText(label, windowOf(window), spanS, ctx) : undefined;
	});

/** `⌁ 4m12s/5m 91%`, or `⌁ cold +120k`. Nothing while `caching_observed` is `false`. */
export const cacheText = ({ input, paint, now }: Ctx): Text => {
	const cache = sub(input, "prompt_cache");
	if (!cache || cache["caching_observed"] === false) {
		return undefined;
	}
	if (typeof cache["warm"] !== "boolean") {
		return undefined;
	}
	const hit = num(cache["hit_ratio"]);
	const expires = num(cache["expires_at"]);
	const cold = num(cache["recache_tokens_if_cold"]);
	const ttl = str(cache["ttl"]);
	const ratio = hit === undefined ? "" : ` ${Math.round(hit * 100)}%`;
	const body = cache["warm"]
		? `${expires === undefined ? "warm" : span(expires * 1000 - now)}${ttl ? `/${ttl}` : ""}`
		: `cold${cold === undefined ? "" : ` +${thousands(cold)}`}`;
	return (cache["warm"] ? paint.ok : paint.inactive)(
		`${ICON.cache} ${body}${ratio}`,
	);
};

export type { Paint };
