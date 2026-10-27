// The segments of the main status line. A missing field gives no segment, and a field with a wrong type shows the error mark.
// Row 0 is the place (folder, git, change), row 1 the session (model, context, cost), row 2 the limits (`5h`, `7d`, spend), and row 3 the cache.

import type { StatusSegment } from "../../kernel/hooks.ts";
import {
	HAIKU_HANDOFF_TRIGGER_TOKENS,
	HANDOFF_TRIGGER_TOKENS,
} from "../session/limits.ts";
import { paintOf } from "./color.ts";
import {
	clock,
	type LimitWindow,
	paceOf,
	span,
	thousands,
	windowText,
} from "./format.ts";
import { ICON } from "./icons.ts";
import { FIVE_HOUR_S, SEVEN_DAY_S, TRIGGER_WARN_FRACTION } from "./limits.ts";
import { parseModel } from "./model.ts";
import type { Change, Limits, Status } from "./types.ts";
import { windowInEffect } from "./window.ts";

type Paint = Status["paint"];
type Text = string | undefined;

const PLAIN = paintOf(false);

const isNumber = (value: unknown): value is number =>
	typeof value === "number" && Number.isFinite(value);

const isStatus = (v: unknown): v is Status =>
	typeof v === "object" && v !== null && "input" in v && "paint" in v;

const segment = (
	id: string,
	row: number,
	text: (status: Status) => Text,
): StatusSegment => ({
	id,
	row,
	render: (raw) => (isStatus(raw) ? text(raw) || null : null),
});

/** The mark of a field with a wrong type, after `icon` when there is one. */
const errorMark = (paint: Paint, icon = ""): string =>
	paint.limit(`${icon} ${ICON.error}`.trim());

/** `⇄ #12 approved`, in the color of the review state. */
const prText = ({ input, paint }: Status): Text => {
	const request = input.pr;
	if (!request) {
		return undefined;
	}
	const style = paint.review(request.review_state);
	if (!isNumber(request.number)) {
		return style(`${ICON.pr} ${ICON.error}`);
	}
	const mark = request.kind === "mr" ? "!" : "#";
	const state = request.review_state ? ` ${request.review_state}` : "";
	return style(`${ICON.pr} ${mark}${request.number}${state}`);
};

const gitText = ({ git: state, paint }: Status): Text => {
	if (!state) {
		return undefined;
	}
	if ("error" in state) {
		return errorMark(paint, ICON.git);
	}
	return [
		paint.branch(`${ICON.git} ${state.branch}`),
		state.dirty > 0 ? paint.warn(`${ICON.dirty}${state.dirty}`) : "",
		state.ahead > 0 ? paint.ok(`${ICON.ahead}${state.ahead}`) : "",
		state.behind > 0 ? paint.limit(`${ICON.behind}${state.behind}`) : "",
	]
		.filter(Boolean)
		.join(" ");
};

/** The compact form has no name, so a narrow row keeps the count. */
const changeText = (change: Change, paint: Paint, compact: boolean): string => {
	const head = compact ? ICON.change : `${ICON.change} ${change.name}`;
	switch (change.state) {
		case "planning":
			return paint.dim(`${head} planning`);
		case "open":
			return paint.dim(
				`${head} ${change.done}/${change.total} ${ICON.next}${change.next}`,
			);
		case "done":
			return paint.ok(`${head} ${change.total}/${change.total} ${ICON.done}`);
		case "error":
			return paint.limit(`${head} ${ICON.error}`);
	}
};

/** The tokens in the window: the input, cache creation, and cache read tokens of `current_usage` (what `used_percentage` counts). Without them, the tokens that `used_percentage` is of `size`. */
const tokensInUse = (
	window: NonNullable<Status["input"]["context_window"]>,
	size: number | undefined,
): number | undefined => {
	const usage = window.current_usage;
	const counts = usage
		? [
				usage.input_tokens,
				usage.cache_creation_input_tokens,
				usage.cache_read_input_tokens,
			].filter(isNumber)
		: [];
	if (counts.length > 0) {
		return total(counts);
	}
	const used = window.used_percentage;
	return isNumber(used) && size !== undefined ? (used / 100) * size : undefined;
};

const total = (counts: number[]): number => {
	let sum = 0;
	for (const n of counts) {
		sum += n;
	}
	return sum;
};

/** The style of the handoff mark for `left` tokens of `trigger`: ok while far, limit at or past the trigger, else warn. */
const handoffStyle = (paint: Paint, left: number, trigger: number) => {
	if (left > trigger * TRIGGER_WARN_FRACTION) {
		return paint.ok;
	}
	return left <= 0 ? paint.limit : paint.warn;
};

/** The reserve or deficit of a window, or `""` with none. */
const arrowText = (paint: Paint, delta: number): string => {
	if (delta < 0) {
		return paint.ok(`${ICON.reserve}${-delta}%`);
	}
	return delta > 0 ? paint.warn(`${ICON.deficit}${delta}%`) : "";
};

/** ` ⇥47%`: the part of the handoff trigger that is left, or `""` without tokens. The trigger cannot be past the window. */
const handoffText = (
	{ input, paint, compaction }: Status,
	size: number | undefined,
	tokens: number | undefined,
): string => {
	if (tokens === undefined) {
		return "";
	}
	const family = parseModel(input.model?.id)?.family;
	const model =
		family === "haiku" ? HAIKU_HANDOFF_TRIGGER_TOKENS : HANDOFF_TRIGGER_TOKENS;
	const trigger = size === undefined ? model : Math.min(model, size);
	const left = trigger - tokens;
	const style = handoffStyle(paint, left, trigger);
	const mark = compaction ? ICON.compaction : ICON.handoff;
	return ` ${style(`${mark}${left <= 0 ? "now" : `${Math.round((left / trigger) * 100)}%`}`)}`;
};

/** `▤ ctx 40% of 300k ⇥45%`: the window in effect, the percent of it with the usage gradient, and the part of the handoff trigger that is left (the compaction threshold with `built-in`). The trigger cannot be past the window. */
const contextText = (status: Status): Text => {
	const { input, paint, windows } = status;
	const window = input.context_window;
	const used = window?.used_percentage ?? undefined;
	if (!window || used === undefined) {
		return undefined;
	}
	if (!isNumber(used)) {
		return errorMark(paint, ICON.context);
	}
	const size = windowInEffect(
		windows,
		input.model?.id,
		window.context_window_size,
	);
	const tokens = tokensInUse(window, window.context_window_size);
	const percent =
		tokens !== undefined && size !== undefined
			? Math.min(100, Math.round((tokens / size) * 100))
			: Math.round(used);
	const of = size === undefined ? "" : ` of ${windowText(size)}`;
	const distance = handoffText(status, size, tokens);
	return `${paint.dim(`${ICON.context} ctx`)} ${paint.level(percent)(`${percent}%`)}${of}${distance}`;
};

/** `⌁ 4m12s/5m 91%`: the time to `expires_at`, the real `ttl`, and the `hit_ratio`. Cold gives `⌁ cold +120k` (the tokens to cache again). No segment when `caching_observed` is `false`. */
const cacheText = ({ input, paint, now }: Status): Text => {
	const state = input.prompt_cache;
	if (!state || state.caching_observed === false) {
		return undefined;
	}
	if (typeof state.warm !== "boolean") {
		return errorMark(paint, ICON.cache);
	}
	const { hit_ratio: hit, expires_at: expires } = state;
	const cold = state.recache_tokens_if_cold;
	const ratio = isNumber(hit) ? ` ${Math.round(hit * 100)}%` : "";
	const body = state.warm
		? `${isNumber(expires) ? span(expires * 1000 - now) : "warm"}${state.ttl ? `/${state.ttl}` : ""}`
		: `cold${isNumber(cold) ? ` +${thousands(cold)}` : ""}`;
	return (state.warm ? paint.ok : paint.inactive)(
		`${ICON.cache} ${body}${ratio}`,
	);
};

/**
 * `◷ 5h 23% ▼13% ↻1:50pm`: the percent has the usage gradient, `compact` gives countdowns, and the spend limit adds `$used/$cap period`.
 * The reset time has the gradient at the percent of the window left, and the run-out time fades from amber at the reset to red now. A window with no `spanS` has a dim reset time.
 */
const limitText = (
	label: string,
	window: LimitWindow,
	spanS: number | undefined,
	{ paint, now, compact }: Status,
): string => {
	const { used_percentage: used, used_usd: usd, limit_usd: cap } = window;
	if (!isNumber(used)) {
		return `${ICON.limit} ${label} ${paint.limit(ICON.error)}`;
	}
	const percent = Math.round(used);
	const nowS = now / 1000;
	const pace = spanS === undefined ? undefined : paceOf(window, nowS, spanS);
	const timeOf = (sec: number) =>
		compact ? span(sec * 1000 - now) : clock(sec, now);
	const resetsAt = window.resets_at ?? 0;
	const runOutAt = pace?.runOutAt;
	const delta = pace?.delta ?? 0;
	const money =
		typeof usd === "number" && typeof cap === "number"
			? paint.dim(
					`$${Math.round(usd)}/$${Math.round(cap)}${window.period ? ` ${window.period}` : ""}`,
				)
			: "";
	const arrow = arrowText(paint, delta);
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
	const head = `${ICON.limit} ${paint.dim(label)} ${paint.level(percent)(`${percent}%`)}`;
	return [head, money, arrow, runOut, reset].filter(Boolean).join(" ");
};

const modelText = ({ input, paint }: Status): Text => {
	const name = input.model?.display_name || input.model?.id;
	if (!name) {
		return undefined;
	}
	const level = input.effort?.level;
	let effort = "";
	if (input.effort !== undefined) {
		effort =
			typeof level === "string"
				? paint.dim(` ${level}`)
				: ` ${paint.limit(ICON.error)}`;
	}
	const thinking = input.thinking?.enabled ? ` ${ICON.thinking}` : "";
	const fast = input.fast_mode ? ` ${paint.warn(ICON.fast)}` : "";
	return `${paint.model(`${ICON.model} ${name}`)}${effort}${thinking}${fast}`;
};

const costText = ({ input, paint }: Status): Text => {
	const usd = input.cost?.total_cost_usd;
	if (usd === undefined) {
		return undefined;
	}
	if (!isNumber(usd)) {
		return errorMark(paint);
	}
	const added = input.cost?.total_lines_added ?? 0;
	const removed = input.cost?.total_lines_removed ?? 0;
	const lines =
		added || removed
			? ` ${paint.ok(`${ICON.added}${added}`)} ${paint.limit(`${ICON.removed}${removed}`)}`
			: "";
	return `${paint.dim(`$${usd.toFixed(2)}`)}${lines}`;
};

/** The limit rows: the label, the key of the window, and its length in seconds (the spend limit has none). */
const LIMIT_ROWS: readonly [string, keyof Limits, number | undefined][] = [
	["5h", "five_hour", FIVE_HOUR_S],
	["7d", "seven_day", SEVEN_DAY_S],
	["spend", "spend_limit", undefined],
];

// The order of the places in a row.
export const SEGMENTS: readonly StatusSegment[] = [
	segment("folder", 0, ({ folder, paint }) =>
		folder ? paint.bold(`${ICON.folder} ${folder}`) : undefined,
	),
	segment("git", 0, (status) =>
		[gitText(status), prText(status)].filter(Boolean).join(" "),
	),
	segment("change", 0, ({ change, paint, compact }) =>
		change ? changeText(change, paint, compact) : undefined,
	),
	segment("model", 1, modelText),
	segment("context", 1, contextText),
	segment("cost", 1, costText),
	...LIMIT_ROWS.map(([label, key, spanS]) =>
		segment(`limit-${label}`, 2, (status) => {
			const window = status.input.rate_limits?.[key];
			const age = status.ages?.[key];
			if (!window) {
				return;
			}
			if (age === undefined) {
				return limitText(label, window, spanS, status);
			}
			// An old reading has no pace, and shows in one dim color with its age.
			const text = limitText(label, window, undefined, {
				...status,
				paint: PLAIN,
			});
			return status.paint.dim(`${text} (${span(age)} ago)`);
		}),
	),
	segment("cache", 3, cacheText),
];
