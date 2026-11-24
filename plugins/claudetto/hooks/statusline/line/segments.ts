import type { Paint, Style } from "./color";
import {
	bar,
	baseName,
	clock,
	FIVE_HOUR_S,
	paceOf,
	SEVEN_DAY_S,
	span,
	wholePercent,
	windowText
} from "./format";
import { num, type Rec, str, sub } from "./input";
import type { LiveState, Waiting } from "./state";

/** What a segment reads: the stdin JSON, the hook-written state, and how to draw. */
export interface Ctx {
	readonly input: Rec;
	readonly state: LiveState | undefined;
	readonly branch: string | undefined;
	readonly paint: Paint;
	/** Epoch milliseconds. */
	readonly now: number;
	/** Countdowns instead of clock times, for a row that does not fit. */
	readonly compact: boolean;
}

/** One piece of a row, or nothing when its figure is absent. */
export type Text = string | undefined;

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
const windowsOf = (input: Rec): Window[] =>
	WINDOWS.flatMap(([label, key, spanS]) => {
		const window = sub(sub(input, "rate_limits"), key);
		const used = num(window?.["used_percentage"]);
		return used === undefined
			? []
			: [{ label, used, resetsAt: num(window?.["resets_at"]), spanS }];
	});

const timeOf = (sec: number, { now, compact }: Ctx): string =>
	compact ? span(sec * 1000 - now) : clock(sec, now);

/** `▶ working` while a turn runs and `○ idle` after it; absent until a hook has written state. */
export const phaseText = ({ state, paint }: Ctx): Text => {
	if (state === undefined) {
		return undefined;
	}
	return state.phase === "working"
		? paint.ok("● working")
		: paint.dim("○ idle");
};

/** The model, its effort level, and `think` when extended thinking is on. */
export const modelText = ({ input, paint }: Ctx): Text => {
	const model = sub(input, "model");
	const name = str(model?.["display_name"]) ?? str(model?.["id"]);
	if (name === undefined) {
		return undefined;
	}
	const effort = str(sub(input, "effort")?.["level"]);
	return [
		paint.model(`❖ ${name}`),
		effort === undefined ? "" : paint.dim(effort),
		sub(input, "thinking")?.["enabled"] === true ? paint.dim("think") : ""
	]
		.filter(Boolean)
		.join(" ");
};

/** `ctx ████░░░░░░ 41% of 200k` from `context_window`. */
export const contextText = ({ input, paint }: Ctx): Text => {
	const context = sub(input, "context_window");
	const used = num(context?.["used_percentage"]);
	if (used === undefined) {
		return undefined;
	}
	const size = num(context?.["context_window_size"]);
	return [
		paint.dim("ctx"),
		bar(used, paint),
		paint.level(used)(`${wholePercent(used)}%`),
		size === undefined ? "" : paint.dim(`of ${windowText(size)}`)
	]
		.filter(Boolean)
		.join(" ");
};

/** Green at an even pace or under, yellow up to 30 percent ahead, red beyond. */
const paceStyle = (ratio: number, paint: Paint): Style => {
	if (ratio <= 1) {
		return paint.ok;
	}
	return ratio <= 1.3 ? paint.warn : paint.bad;
};

/** `5h 1.2x (60% used, 50% elapsed) runs out 3:10pm` for one fixed window; absent when its pace is unknown. */
const paceText = (window: Window, ctx: Ctx): Text => {
	const { label, used, resetsAt, spanS } = window;
	if (spanS === undefined || resetsAt === undefined) {
		return undefined;
	}
	const pace = paceOf(used, resetsAt, ctx.now / 1000, spanS);
	if (pace === undefined) {
		return undefined;
	}
	const { paint } = ctx;
	const runOut =
		pace.runOutAt === undefined
			? ""
			: paint.bad(`runs out ${timeOf(pace.runOutAt, ctx)}`);
	return [
		paint.dim(label),
		paceStyle(pace.ratio, paint)(`${pace.ratio.toFixed(1)}x`),
		paint.dim(
			`(${Math.round(used)}% used, ${Math.round(pace.elapsed)}% elapsed)`
		),
		runOut
	]
		.filter(Boolean)
		.join(" ");
};

/** The pace of each fixed window, so the 5h and 7d only. */
export const paceTexts = (ctx: Ctx): Text[] =>
	windowsOf(ctx.input).map((window) => paceText(window, ctx));

/** `5h ████░░░░░░ 23% ↻1:50pm` for each reported window. */
export const accountTexts = (ctx: Ctx): Text[] =>
	windowsOf(ctx.input).map(({ label, used, resetsAt }) => {
		const { paint, now } = ctx;
		const reset =
			resetsAt !== undefined && resetsAt * 1000 > now
				? paint.dim(`↻${timeOf(resetsAt, ctx)}`)
				: "";
		return [
			paint.dim(label),
			bar(used, paint),
			paint.level(used)(`${wholePercent(used)}%`),
			reset
		]
			.filter(Boolean)
			.join(" ");
	});

/** The session's name when it has one. */
export const nameText = ({ input, paint }: Ctx): Text => {
	const name = str(input["session_name"]);
	return name === undefined ? undefined : paint.bold(name);
};

/** `12m` since the session started, from `cost.total_duration_ms`. */
export const durationText = ({ input, paint }: Ctx): Text => {
	const ms = num(sub(input, "cost")?.["total_duration_ms"]);
	return ms === undefined ? undefined : paint.dim(`◔ ${span(ms)}`);
};

/** `+120 -30` lines of the session, shown once either is non-zero. */
export const linesText = ({ input, paint }: Ctx): Text => {
	const cost = sub(input, "cost");
	const added = num(cost?.["total_lines_added"]) ?? 0;
	const removed = num(cost?.["total_lines_removed"]) ?? 0;
	return added || removed
		? `${paint.ok(`+${added}`)} ${paint.bad(`-${removed}`)}`
		: undefined;
};

/** The dollars are a client-side estimate, so they show only with no `rate_limits` window (an API account). */
export const costText = ({ input, paint }: Ctx): Text => {
	const usd = num(sub(input, "cost")?.["total_cost_usd"]);
	return usd === undefined || windowsOf(input).length > 0
		? undefined
		: paint.dim(`$${usd.toFixed(2)}`);
};

/** `cache 91% warm 4m/5m` or `cache 40% cold`, from `prompt_cache`. */
export const cacheText = ({ input, paint, now }: Ctx): Text => {
	const cache = sub(input, "prompt_cache");
	if (typeof cache?.["warm"] !== "boolean") {
		return undefined;
	}
	const hit = num(cache["hit_ratio"]);
	const expires = num(cache["expires_at"]);
	const ttl = str(cache["ttl"]);
	const state = cache["warm"]
		? `warm${expires === undefined ? "" : ` ${span(expires * 1000 - now)}`}${ttl === undefined ? "" : `/${ttl}`}`
		: "cold";
	const style = cache["warm"] ? paint.ok : paint.dim;
	return style(
		`cache${hit === undefined ? "" : ` ${Math.round(hit * 100)}%`} ${state}`
	);
};

/** The project folder, or the repository's `owner/name` when stdin names one. */
export const projectText = ({ input, paint }: Ctx): Text => {
	const workspace = sub(input, "workspace");
	const repo = sub(workspace, "repo");
	const owner = str(repo?.["owner"]);
	const name = str(repo?.["name"]);
	const dir =
		str(workspace?.["project_dir"]) ?? str(workspace?.["current_dir"]);
	const folder = dir === undefined ? undefined : baseName(dir);
	const label =
		owner !== undefined && name !== undefined ? `${owner}/${name}` : folder;
	return label === undefined ? undefined : paint.bold(`⌂ ${label}`);
};

/** The branch: the worktree's own when stdin names it, else the one `HEAD` names. */
export const branchText = ({ input, branch, paint }: Ctx): Text => {
	const name = str(sub(input, "worktree")?.["branch"]) ?? branch;
	return name === undefined ? undefined : paint.model(`⎇ ${name}`);
};

const reviewStyle = (state: string | undefined, paint: Paint): Style => {
	if (state === "approved") {
		return paint.ok;
	}
	return state === "changes_requested" ? paint.bad : paint.warn;
};

/** `⇄ #12 approved`, from `pr`, in the colour of the review state. */
export const prText = ({ input, paint }: Ctx): Text => {
	const pr = sub(input, "pr");
	const number = num(pr?.["number"]);
	if (number === undefined) {
		return undefined;
	}
	const state = str(pr?.["review_state"]);
	return reviewStyle(
		state,
		paint
	)(`⇄ #${number}${state === undefined ? "" : ` ${state}`}`);
};

const waitingWhat = ({ kind, tool }: Waiting): string => {
	if (kind === "input") {
		return "your next prompt";
	}
	if (kind === "question") {
		return "an answer";
	}
	return `permission${tool === undefined ? "" : ` for ${tool}`}`;
};

/** `⚑ waiting on you: allow Bash`, from the prompt a hook saw the engine raise. */
export const waitingText = ({ state, paint }: Ctx): Text => {
	const waiting = state?.waiting;
	if (waiting === undefined) {
		return undefined;
	}
	return paint.alert(`⚑ waiting on you: ${waitingWhat(waiting)}`);
};

/** The longest agent description shown, a choice that keeps one agent to part of a row. */
const DESCRIPTION_MAX = 40;

/** One text per running agent, oldest first: `⏵ Explore find the login flow 3m`. */
export const agentTexts = ({ state, paint, now }: Ctx): string[] =>
	(state?.agents ?? []).map((agent) => {
		const about =
			agent.description === ""
				? ""
				: ` ${paint.dim(agent.description.slice(0, DESCRIPTION_MAX))}`;
		return `${paint.info("⏵")} ${paint.bold(agent.type)}${about} ${paint.dim(span(now - agent.startedAt))}`;
	});
