// The segments of the main status line. A missing field gives no segment, and a field with a wrong type shows the error mark.
// Row 0 is the place (folder, git, change), row 1 the session (model, context, cost), row 2 the limits (`5h`, `7d`, spend), and row 3 the cache.

import type { StatusSegment } from "../../kernel/hooks.ts";
import { paintOf } from "./color.ts";
import { contextText } from "./context.ts";
import { clock, type LimitWindow, paceOf, span, thousands } from "./format.ts";
import { ICON } from "./icons.ts";
import { FIVE_HOUR_S, SEVEN_DAY_S } from "./limits.ts";
import { errorMark, isNumber, type Paint, type Text } from "./marks.ts";
import type { Change, Limits, Status } from "./types.ts";

const PLAIN = paintOf(false);

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

/** The reserve or deficit of a window, or `""` with none. */
const arrowText = (paint: Paint, delta: number): string => {
	if (delta < 0) {
		return paint.ok(`${ICON.reserve}${-delta}%`);
	}
	return delta > 0 ? paint.warn(`${ICON.deficit}${delta}%`) : "";
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
