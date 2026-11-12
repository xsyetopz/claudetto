import type { Usage } from "./usage.ts";

/** Every number here is FAKE: the context size is a function of the human turns in the body, not a count of its tokens. */
export const BASE_TOKENS = 20_000;
export const TOKENS_PER_TURN = 5000;

interface Message {
	readonly role: string;
	readonly content: string | readonly { readonly type: string }[];
}

/** A user message with text, not one that only carries tool results. */
const isHuman = (m: Message): boolean =>
	m.role === "user" &&
	(typeof m.content === "string" ||
		m.content.some((block) => block.type === "text"));

export const humanTurns = (messages: readonly Message[]): number =>
	messages.filter((item) => isHuman(item)).length;

/** FAKE context size: it falls when a compaction shortens the messages, and grows by one step per human turn after. */
export const fakeContextTokens = (messages: readonly Message[]): number =>
	BASE_TOKENS + TOKENS_PER_TURN * humanTurns(messages);

const UNCACHED = 10;

/** FAKE usage: the previous request's prefix is read, the rest is written under `ttl`. */
export const fakeUsage = (a: {
	readonly total: number;
	readonly previous: number;
	readonly ttl: "5m" | "1h";
}): Usage => {
	const read = Math.min(a.previous, a.total - UNCACHED);
	const write = a.total - UNCACHED - read;
	return {
		input_tokens: UNCACHED,
		output_tokens: 0,
		cache_read_input_tokens: read,
		cache_creation_input_tokens: write,
		cache_creation: {
			ephemeral_5m_input_tokens: a.ttl === "5m" ? write : 0,
			ephemeral_1h_input_tokens: a.ttl === "1h" ? write : 0,
		},
	};
};
