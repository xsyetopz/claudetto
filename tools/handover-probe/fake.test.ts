import { expect, test } from "bun:test";

import {
	BASE_TOKENS,
	fakeContextTokens,
	fakeUsage,
	humanTurns,
	TOKENS_PER_TURN,
} from "./fake.ts";

const human = (text: string) => ({ role: "user", content: text });
const blocks = (text: string) => ({
	role: "user",
	content: [{ type: "text", text }],
});
const result = {
	role: "user",
	content: [{ type: "tool_result", tool_use_id: "t", content: "ok" }],
};
const reply = { role: "assistant", content: [{ type: "text", text: "ok" }] };

test("a human turn is a user message with text, not a tool result", () => {
	expect(humanTurns([human("a"), reply, result, blocks("b")])).toBe(2);
});

test("fake context tokens grow by a fixed step per human turn", () => {
	const one = fakeContextTokens([human("a")]);
	const three = fakeContextTokens([
		human("a"),
		reply,
		human("b"),
		reply,
		blocks("c"),
	]);
	expect(one).toBe(BASE_TOKENS + TOKENS_PER_TURN);
	expect(three - one).toBe(2 * TOKENS_PER_TURN);
});

test("usage reads the previous prefix from the cache and writes the rest", () => {
	const usage = fakeUsage({ total: 100_000, previous: 80_000, ttl: "5m" });
	expect(usage.cache_read_input_tokens).toBe(80_000);
	expect(usage.cache_creation).toEqual({
		ephemeral_5m_input_tokens: 19_990,
		ephemeral_1h_input_tokens: 0,
	});
	expect(usage.input_tokens).toBe(10);
});

test("usage books the write under the body's TTL", () => {
	const usage = fakeUsage({ total: 100_000, previous: 0, ttl: "1h" });
	expect(usage.cache_creation).toEqual({
		ephemeral_5m_input_tokens: 0,
		ephemeral_1h_input_tokens: 99_990,
	});
});

test("a request smaller than the previous one reads only what it holds", () => {
	const usage = fakeUsage({ total: 30_000, previous: 80_000, ttl: "5m" });
	expect(usage.cache_read_input_tokens).toBe(29_990);
	expect(usage.cache_creation_input_tokens).toBe(0);
});
