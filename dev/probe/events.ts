// The stream-json events of a `claude -p` step, and the checks that a run of steps is valid.

export interface Usage {
	input_tokens?: number;
	cache_read_input_tokens?: number;
	cache_creation_input_tokens?: number;
}
export interface Block {
	type?: string;
	id?: string;
	name?: string;
	text?: string;
	input?: { file_path?: string };
}
/** The fields of a stream-json event that the probe reads. */
export interface Event {
	type?: string;
	subtype?: string;
	is_error?: boolean;
	session_id?: string;
	total_cost_usd?: number;
	duration_ms?: number;
	compact_metadata?: { post_tokens?: number };
	message?: { id?: string; content?: Block[]; usage?: Usage };
}

/** One `claude -p` run: its exit code, and its stream-json events. */
export interface Step {
	code: number;
	events: Event[];
}

export const last = (events: Event[]): Event =>
	events.findLast((e) => e.type === "result") ?? {};
/** The tool calls of `events`, as `[name, file_path]`. */
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
/** The cache read share of the requests `rs`. */
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

export interface Base {
	cost: number;
	read: Set<string>;
	edited: Set<string>;
}

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

/** The cause that the steps are not valid, or `null`: a step problem, or a total that is below the one before (`cost` is the total of the base). */
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
