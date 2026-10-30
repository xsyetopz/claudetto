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
export interface CompactMetadata {
	trigger?: string;
	pre_tokens?: number;
	post_tokens?: number;
}

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

export interface Step {
	code: number;
	events: Event[];
}

export interface Base {
	cost: number;
	read: Set<string>;
	edited: Set<string>;
}

export const COMPACT_BOUNDARY = "compact_boundary";

export const last = (events: Event[]): Event =>
	events.findLast((e) => e.type === "result") ?? {};

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

export const requests = (events: Event[]): Usage[] => [
	...new Map(
		events
			.filter((e) => e.type === "assistant" && e.message)
			.map((e) => [e.message?.id, e.message?.usage ?? {}]),
	).values(),
];

const sentOf = (u: Usage): number =>
	(u.input_tokens ?? 0) +
	(u.cache_read_input_tokens ?? 0) +
	(u.cache_creation_input_tokens ?? 0);

export const contextOf = (events: Event[]): number =>
	sentOf(requests(events).at(-1) ?? {});

export const peak = (events: Event[]): number => {
	let most = 0;
	for (const u of requests(events)) {
		most = Math.max(most, sentOf(u));
	}
	return most;
};

export const boundaries = (events: Event[]): CompactMetadata[] =>
	events
		.filter((e) => e.subtype === COMPACT_BOUNDARY)
		.map((e) => e.compact_metadata ?? {});

export const afterCompaction = (events: Event[]): Usage[] => {
	const at = events.findIndex((e) => e.subtype === COMPACT_BOUNDARY);
	return at < 0 ? [] : requests(events.slice(at + 1));
};

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
