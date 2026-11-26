import type { Paint, Style } from "./color";
import { type Ctx, type Text, words } from "./ctx";
import {
	bar,
	baseName,
	span,
	thousands,
	wholePercent,
	windowText
} from "./format";
import { num, type Rec, str, sub } from "./input";
import { windowsOf } from "./limits";

/** The output style when it is not the default one. */
const styleName = (input: Rec): string | undefined => {
	const name = str(sub(input, "output_style")?.["name"]);
	return name === undefined || name.toLowerCase() === "default"
		? undefined
		: name;
};

/** `Opus 5.5 high ↯ fast ◇ Explanatory @reviewer`: the model, its effort, fast mode, a non-default output style, and the `--agent` the session runs as. */
export const modelText = ({ input, paint }: Ctx): Text => {
	const model = sub(input, "model");
	const name = str(model?.["display_name"]) ?? str(model?.["id"]);
	if (name === undefined) {
		return undefined;
	}
	const effort = str(sub(input, "effort")?.["level"]);
	const style = styleName(input);
	const agent = str(sub(input, "agent")?.["name"]);
	return words(
		paint.model(name),
		effort !== undefined && paint.dim(effort),
		input["fast_mode"] === true && paint.fast("↯ fast"),
		style !== undefined && paint.info(`◇ ${style}`),
		agent !== undefined && paint.agent(`@${agent}`)
	);
};

/**
 * `ctx ████░░░░░░ 40% 80k/200k` from `context_window`, its filled cells split
 * by /context's rows in their colours once a hook recorded them. Where a hook
 * recorded a smaller window /context measures against (an `autoCompactWindow`
 * of 300k on a 1M model), the share and the total are of that window, because
 * compaction runs there and the model's limit is never reached.
 */
export const contextText = ({ input, paint, state }: Ctx): Text => {
	const context = sub(input, "context_window");
	const reported = num(context?.["used_percentage"]);
	if (reported === undefined) {
		return undefined;
	}
	const model = num(context?.["context_window_size"]);
	const limit = state?.window;
	const isSmaller = model !== undefined && limit !== undefined && limit < model;
	const size = isSmaller ? limit : model;
	const used = isSmaller ? (reported * model) / limit : reported;
	return words(
		paint.dim("ctx"),
		bar(
			used,
			paint,
			undefined,
			(state?.context ?? []).map((part) => ({
				weight: part.tokens,
				style: paint.tone(part.color)
			}))
		),
		paint.level(used)(`${wholePercent(used)}%`),
		size !== undefined &&
			paint.dim(`${thousands((used / 100) * size)}/${windowText(size)}`)
	);
};

/** `cache 91% warm 4m/5m` or `cache 40% cold`, with `2 miss` once a request re-processed the prefix. */
export const cacheText = ({ input, paint, now }: Ctx): Text => {
	const cache = sub(input, "prompt_cache");
	if (typeof cache?.["warm"] !== "boolean") {
		return undefined;
	}
	const hit = num(cache["hit_ratio"]);
	const expires = num(cache["expires_at"]);
	const ttl = str(cache["ttl"]);
	const misses = num(cache["misses"]) ?? 0;
	const left = expires === undefined ? "" : ` ${span(expires * 1000 - now)}`;
	const state = cache["warm"]
		? `warm${left}${ttl === undefined ? "" : `/${ttl}`}`
		: "cold";
	return words(
		(cache["warm"] ? paint.ok : paint.dim)(
			`cache${hit === undefined ? "" : ` ${Math.round(hit * 100)}%`} ${state}`
		),
		misses > 0 && paint.warn(`${misses} miss`)
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

/** The branch: the worktree's own when stdin names it, else the one `HEAD` names; `⊞ name` marks a linked worktree. */
export const branchText = ({ input, branch, paint }: Ctx): Text => {
	const name = str(sub(input, "worktree")?.["branch"]) ?? branch;
	const tree = str(sub(input, "workspace")?.["git_worktree"]);
	return name === undefined && tree === undefined
		? undefined
		: words(
				name !== undefined && paint.branch(`⎇ ${name}`),
				tree !== undefined && paint.dim(`⊞ ${tree}`)
			);
};

const reviewStyle = (state: string | undefined, paint: Paint): Style => {
	if (state === "approved") {
		return paint.ok;
	}
	if (state === "draft") {
		return paint.dim;
	}
	return state === "changes_requested" ? paint.bad : paint.warn;
};

/** `⇄ #12 approved`, from `pr`, in the colour of the review state; `!12` for a GitLab merge request. */
export const prText = ({ input, paint }: Ctx): Text => {
	const pr = sub(input, "pr");
	const number = num(pr?.["number"]);
	if (number === undefined) {
		return undefined;
	}
	const state = str(pr?.["review_state"]);
	const mark = str(pr?.["kind"]) === "mr" ? "!" : "#";
	return reviewStyle(
		state,
		paint
	)(`⇄ ${mark}${number}${state === undefined ? "" : ` ${state}`}`);
};

/** The session's name when it has one. */
export const nameText = ({ input, paint }: Ctx): Text => {
	const name = str(input["session_name"]);
	return name === undefined ? undefined : paint.bold(name);
};

/** `◔ 12m (api 4m)`: wall time since the session started and the part spent waiting on the API. */
export const durationText = ({ input, paint }: Ctx): Text => {
	const cost = sub(input, "cost");
	const ms = num(cost?.["total_duration_ms"]);
	if (ms === undefined) {
		return undefined;
	}
	const api = num(cost?.["total_api_duration_ms"]);
	return paint.dim(
		`◔ ${span(ms)}${api === undefined ? "" : ` (api ${span(api)})`}`
	);
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

/** The dollars are a client-side estimate, so they show only with no `rate_limits` (an API account). */
export const costText = ({ input, paint }: Ctx): Text => {
	const usd = num(sub(input, "cost")?.["total_cost_usd"]);
	return usd === undefined || windowsOf(input).length > 0
		? undefined
		: paint.dim(`$${usd.toFixed(2)}`);
};
