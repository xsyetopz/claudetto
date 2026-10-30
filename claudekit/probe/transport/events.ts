// The stream-json events of a `claude -p` step, and the checks that a run of steps is valid.

/** The token counts of a message `usage`, each absent when the event omits it. */
export interface Usage {
	input_tokens?: number;
	cache_read_input_tokens?: number;
	cache_creation_input_tokens?: number;
}
/** A content block of an assistant message; only the fields that the probe reads are kept. */
export interface Block {
	type?: string;
	id?: string;
	name?: string;
	text?: string;
	input?: { file_path?: string };
}
/**
 * The metadata of a `compact_boundary` event, as `2.1.312` emits it in stream-json: `pre_tokens` is
 * required there and `post_tokens` optional. It is the harness's own count of the context, which is the
 * number the threshold is compared with, and it is not the billed size of any request. The transcript
 * keeps the same record under camel-case names, which `claudekit/compaction-cost/transcripts/transcripts.ts` reads.
 */
export interface CompactMetadata {
	trigger?: string;
	pre_tokens?: number;
	post_tokens?: number;
}

/** The fields of a stream-json event that the probe reads. */
export interface Event {
	type?: string;
	subtype?: string;
	is_error?: boolean;
	session_id?: string;
	total_cost_usd?: number;
	num_turns?: number;
	duration_ms?: number;
	compact_metadata?: CompactMetadata;
	message?: { id?: string; content?: Block[]; usage?: Usage };
}

/** One `claude -p` run: its exit code, and its stream-json events. */
export interface Step {
	code: number;
	events: Event[];
}

/** What the base session leaves for a fork to be scored against. */
export interface Base {
	cost: number;
	read: Set<string>;
	edited: Set<string>;
}

/** The subtype of the event that marks a compaction. */
export const COMPACT_BOUNDARY = "compact_boundary";

/** The last `result` event of `events`, or an empty event when the step produced none. */
export const last = (events: Event[]): Event =>
	events.findLast((e) => e.type === "result") ?? {};

/** The tool calls of `events`, as `[name, file_path]`. A call with no `input.file_path` is dropped. */
export const calls = (events: Event[]): [string, string][] =>
	events
		.filter((e) => e.type === "assistant")
		.flatMap((e) =>
			(e.message?.content ?? []).flatMap((b): [string, string][] =>
				b.type === "tool_use" && b.name && b.input?.file_path
					? [[b.name, b.input.file_path]]
					: [],
			),
		);

/** The usage of each request of `events`, once for each message id. */
export const requests = (events: Event[]): Usage[] => [
	...new Map(
		events
			.filter((e) => e.type === "assistant" && e.message)
			.map((e) => [e.message?.id, e.message?.usage ?? {}]),
	).values(),
];

/** The tokens one request was billed for: uncached, cache-read and cache-written together. */
const sentOf = (u: Usage): number =>
	(u.input_tokens ?? 0) +
	(u.cache_read_input_tokens ?? 0) +
	(u.cache_creation_input_tokens ?? 0);

/**
 * The context the last request of `events` was billed for, which is where the session ended. 0 for
 * events that hold no request. It is the figure a threshold has to be set against, so it is read here
 * rather than in one caller: the base session of a probe round and the calibration step of
 * `claudekit/compaction-price/` both set a threshold from it and must read it the same way.
 */
export const contextOf = (events: Event[]): number =>
	sentOf(requests(events).at(-1) ?? {});

/**
 * The largest context any request of `events` was billed for, in tokens: uncached, cache-read and
 * cache-written together. In a fork that did not compact it says how close the fork came, so a round
 * where nothing compacted names its own cause instead of only its absence.
 *
 * It is not the point a threshold fired at, and a fork that compacted has that in `pre_tokens` instead.
 * Two reasons. The largest request of such a fork is the prompt re-sent after the compaction, not the
 * high mark before it. And the billed count lags the harness's own count, which the round of 2026-10-29
 * measured at 79,714 billed against 176,591 counted, because a batch of parallel tool results joins the
 * context between two threshold checks.
 */
export const peak = (events: Event[]): number => {
	let most = 0;
	for (const u of requests(events)) {
		most = Math.max(most, sentOf(u));
	}
	return most;
};

/** The metadata of each compaction of `events`, in the order the compactions fired. */
export const boundaries = (events: Event[]): CompactMetadata[] =>
	events
		.filter((e) => e.subtype === COMPACT_BOUNDARY)
		.map((e) => e.compact_metadata ?? {});

/** The requests that come after the first compaction of `events`, or none when it holds no compaction. */
export const afterCompaction = (events: Event[]): Usage[] => {
	const at = events.findIndex((e) => e.subtype === COMPACT_BOUNDARY);
	return at < 0 ? [] : requests(events.slice(at + 1));
};

/** The share of the input of `rs` that was read from the cache, from 0 to 1: cache reads over cache reads, cache writes and plain input. It is 0 for no requests. */
export const readShare = (rs: Usage[]): number => {
	const sum = (k: keyof Usage) => {
		let total = 0;
		for (const u of rs) {
			total += u[k] ?? 0;
		}
		return total;
	};
	return (
		sum("cache_read_input_tokens") /
		(sum("cache_read_input_tokens") +
			sum("cache_creation_input_tokens") +
			sum("input_tokens") || 1)
	);
};

/** The cause that one step is not valid, or `null`: a non-zero exit, no `result` event, `is_error`, a subtype other than success, or no `session_id`. */
export const stepProblem = ({ code, events }: Step): string | null => {
	const r = events.findLast((e) => e.type === "result");
	if (code !== 0) {
		return `exit ${code}`;
	}
	if (!r) {
		return "no result event";
	}
	if (r.is_error) {
		return `is_error (${r.subtype})`;
	}
	if (r.subtype !== "success") {
		return `subtype ${r.subtype}`;
	}
	return r.session_id ? null : "no session_id";
};

/**
 * The cause that the steps are not valid, or `null`: a step problem, or a total that is below the one before.
 * `cost` is the total of the base. A fork starts with the cost of its base, and `total_cost_usd` is cumulative.
 */
export const problem = (steps: Step[], cost: number): string | null => {
	let before = cost;
	for (const [i, step] of steps.entries()) {
		const total = last(step.events).total_cost_usd;
		const why =
			stepProblem(step) ??
			(typeof total === "number" ? null : "no total_cost_usd") ??
			(total !== undefined && total < before
				? `total_cost_usd fell from ${before} to ${total}`
				: null);
		if (why) {
			return `step ${i + 1}: ${why}`;
		}
		before = total ?? before;
	}
	return null;
};
