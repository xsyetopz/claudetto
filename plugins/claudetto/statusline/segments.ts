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
import { FIVE_HOUR_S, SEVEN_DAY_S, SPEC_CHANGES_SHOWN } from "./limits.ts";
import type { Local } from "./local.ts";

export interface Ctx {
	input: Rec;
	local: Local;
	paint: Paint;
	now: number;
	compact: boolean;
}

export type Text = string | undefined;

const LIMITS = ["five_hour", "seven_day"] as const;

/** The CLI unloads a plugin whose hooks crash its worker and says that `/reload-plugins` brings it back. */
export const hooksOffText = ({ local, paint }: Ctx): Text =>
	local.hooksOff
		? paint.limit(`${ICON.error} claudetto hooks off: /reload-plugins`)
		: undefined;

export const folderText = ({ input, paint }: Ctx): Text => {
	const dir =
		str(sub(input, "workspace")?.["current_dir"]) ?? str(input["cwd"]);
	return dir ? paint.bold(`${ICON.folder} ${baseName(dir)}`) : undefined;
};

/** A plain checkout reports no branch on stdin. */
export const branchText = ({ input, local, paint }: Ctx): Text => {
	const name = str(sub(input, "worktree")?.["branch"]) ?? local.branch;
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

export const specText = ({ local, paint }: Ctx): Text => {
	const open = local.changes
		.filter((change) => change.done < change.total)
		.toSorted((a, b) => b.mtimeMs - a.mtimeMs);
	if (open.length === 0) {
		return undefined;
	}
	const named = open
		.slice(0, SPEC_CHANGES_SHOWN)
		.map(({ name, done, total }) => `${name} ${done}/${total}`)
		.join(", ");
	const rest = open.length - SPEC_CHANGES_SHOWN;
	return paint.inactive(`${ICON.spec} ${named}${rest > 0 ? ` +${rest}` : ""}`);
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

/**
 * `◫ ctx 33% of 300k`, with the percent in the usage gradient. The window is the one compaction runs against, from
 * the line file, since stdin's `used_percentage` is measured against the model's window.
 */
export const contextText = ({ input, local, paint }: Ctx): Text => {
	const tokens = num(sub(input, "context_window")?.["total_input_tokens"]);
	if (tokens === undefined || local.window === undefined) {
		return undefined;
	}
	const percent = Math.round((tokens / local.window) * 100);
	return [
		paint.dim(`${ICON.context} ctx`),
		paint.level(percent)(`${percent}%`),
		paint.dim(`of ${windowText(local.window)}`),
	].join(" ");
};

/** The dollars are a client-side estimate, so the line hides them (a choice) when `rate_limits` reports a window. */
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

const CAUSE_MAX = 24;

/** The first cause of the last miss as words, or nothing when no miss happened or the shape is unknown. */
const missText = (cache: Rec): string | undefined => {
	const misses = num(cache["misses"]);
	const causes = sub(cache, "last_miss_cause")?.["causes"];
	if (misses === undefined || misses <= 0 || !Array.isArray(causes)) {
		return undefined;
	}
	const first: unknown = causes[0];
	const cause = typeof first === "string" ? str(first) : undefined;
	return cause === undefined
		? undefined
		: `miss: ${cause.replaceAll("_", " ").slice(0, CAUSE_MAX)}`;
};

/** `⌁ 4m/5m 91%`, or `⌁ cold +120k`, then `miss: tools changed` after a miss. Nothing while `caching_observed` is `false`. */
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
	const miss = missText(cache);
	return (cache["warm"] ? paint.ok : paint.inactive)(
		`${ICON.cache} ${body}${ratio}${miss === undefined ? "" : ` ${miss}`}`,
	);
};

export type { Paint };
