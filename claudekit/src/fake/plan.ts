// Pure parts of the fake Messages API: which step answers a request, the SSE body, and usage.

// Hypothesis: about 3.6 characters of request JSON per token. The fake's usage is shaped like the real one, and the ledger never prices a fake run.
const CHARS_PER_TOKEN = 3.6;
const CACHE_MARK = '"cache_control"';

export type StopReason =
	| "end_turn"
	| "max_tokens"
	| "tool_use"
	| "stop_sequence"
	| "pause_turn"
	| "refusal";

export type Block =
	| { type: "text"; text: string }
	| {
			type: "tool_use";
			name: string;
			input: Record<string, unknown>;
			id?: string;
	  }
	| { type: "thinking"; thinking: string };

export interface Reply {
	blocks?: Block[];
	stop?: StopReason;
	delayMs?: number;
	error?: { status: number; type: string; message: string };
	id?: string;
	outputTokens?: number;
}

export interface Match {
	hasTools?: boolean;
	lastUserIncludes?: string;
	model?: string;
}

export interface Step {
	match?: Match;
	reply: Reply;
}

export interface Plan {
	steps: Step[];
	fallback?: Reply;
}

export interface Usage {
	input_tokens: number;
	cache_creation_input_tokens: number;
	cache_read_input_tokens: number;
	output_tokens: number;
}

export interface MessagesBody {
	model?: string;
	system?: unknown;
	tools?: unknown[];
	messages?: { role: string; content: unknown }[];
}

// With nonessential traffic off, every /v1/messages request of a -p run is a main-loop request, with or without tools.
const DEFAULT_MATCH: Match = {};
const FALLBACK: Reply = {
	blocks: [{ type: "text", text: "OK." }],
	stop: "end_turn",
};

export const fallbackReply = (plan: Plan): Reply => plan.fallback ?? FALLBACK;

export const matches = (match: Match, body: MessagesBody): boolean => {
	if (
		match.hasTools !== undefined &&
		match.hasTools !== (body.tools ?? []).length > 0
	) {
		return false;
	}
	if (match.model !== undefined && match.model !== body.model) {
		return false;
	}
	if (
		match.lastUserIncludes !== undefined &&
		!lastUserText(body).includes(match.lastUserIncludes)
	) {
		return false;
	}
	return true;
};

// Returns the index of the first unused step that matches, or -1.
export const pickStep = (
	plan: Plan,
	used: ReadonlySet<number>,
	body: MessagesBody,
): number =>
	plan.steps.findIndex(
		(s, i) => !used.has(i) && matches(s.match ?? DEFAULT_MATCH, body),
	);

export const lastUserText = (body: MessagesBody): string => {
	const users = (body.messages ?? []).filter((m) => m.role === "user");
	const last = users.at(-1);
	if (!last) {
		return "";
	}
	if (typeof last.content === "string") {
		return last.content;
	}
	return JSON.stringify(last.content);
};

export const tokensFor = (chars: number): number =>
	Math.max(1, Math.round(chars / CHARS_PER_TOKEN));

// The prompt up to the last cache_control mark is cacheable; the part shared with the previous request's cacheable part is a hit, the rest of it a write.
export const usageFor = (
	bodyText: string,
	previousCacheable: string,
	outputTokens: number,
): { usage: Usage; cacheable: string } => {
	const mark = bodyText.lastIndexOf(CACHE_MARK);
	const cacheable = mark < 0 ? "" : bodyText.slice(0, mark);
	const shared = commonPrefix(cacheable, previousCacheable);
	const read = shared === 0 ? 0 : tokensFor(shared);
	const write =
		cacheable.length - shared === 0 ? 0 : tokensFor(cacheable.length - shared);
	return {
		usage: {
			input_tokens: tokensFor(bodyText.length - cacheable.length),
			cache_creation_input_tokens: write,
			cache_read_input_tokens: read,
			output_tokens: outputTokens,
		},
		cacheable,
	};
};

export const outputTokensOf = (reply: Reply): number => {
	if (reply.outputTokens !== undefined) {
		return reply.outputTokens;
	}
	const chars = (reply.blocks ?? []).reduce(
		(n, b) => n + JSON.stringify(b).length,
		0,
	);
	return tokensFor(chars);
};

export const sse = (opts: {
	reply: Reply;
	id: string;
	model: string;
	usage: Usage;
	toolId: (i: number) => string;
}): string => {
	const { reply, id, model, usage } = opts;
	const blocks = reply.blocks ?? [];
	const stop =
		reply.stop ??
		(blocks.some((b) => b.type === "tool_use") ? "tool_use" : "end_turn");
	const start = {
		message: {
			id,
			type: "message",
			role: "assistant",
			model,
			content: [],
			stop_reason: null,
			stop_sequence: null,
			usage: { ...usage, output_tokens: 1 },
		},
	};
	const parts = [event("message_start", start)];
	blocks.forEach((b, index) => {
		parts.push(...blockEvents(b, index, opts.toolId(index)));
	});
	parts.push(
		event("message_delta", {
			delta: { stop_reason: stop, stop_sequence: null },
			usage: { output_tokens: usage.output_tokens },
		}),
		event("message_stop", {}),
	);
	return parts.join("");
};

export const errorBody = (error: NonNullable<Reply["error"]>): string =>
	JSON.stringify({
		type: "error",
		error: { type: error.type, message: error.message },
	});

const event = (type: string, data: object): string =>
	`event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`;

const blockEvents = (b: Block, index: number, toolId: string): string[] => {
	switch (b.type) {
		case "text":
			return [
				event("content_block_start", {
					index,
					content_block: { type: "text", text: "" },
				}),
				event("content_block_delta", {
					index,
					delta: { type: "text_delta", text: b.text },
				}),
				event("content_block_stop", { index }),
			];
		case "tool_use":
			return [
				event("content_block_start", {
					index,
					content_block: {
						type: "tool_use",
						id: b.id ?? toolId,
						name: b.name,
						input: {},
					},
				}),
				event("content_block_delta", {
					index,
					delta: {
						type: "input_json_delta",
						partial_json: JSON.stringify(b.input),
					},
				}),
				event("content_block_stop", { index }),
			];
		case "thinking":
			return [
				event("content_block_start", {
					index,
					content_block: { type: "thinking", thinking: "", signature: "" },
				}),
				event("content_block_delta", {
					index,
					delta: { type: "thinking_delta", thinking: b.thinking },
				}),
				event("content_block_delta", {
					index,
					delta: { type: "signature_delta", signature: "fake" },
				}),
				event("content_block_stop", { index }),
			];
		default:
			return [];
	}
};

const commonPrefix = (a: string, b: string): number => {
	const n = Math.min(a.length, b.length);
	let i = 0;
	while (i < n && a.charCodeAt(i) === b.charCodeAt(i)) {
		i++;
	}
	return i;
};
