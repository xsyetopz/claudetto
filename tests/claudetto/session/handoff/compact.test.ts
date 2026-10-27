// The size count of code compaction (spec `code-compaction`): the tokens of a message, and the answer that code builds.

import { expect, test } from "bun:test";
import type { SessionMessage } from "claude-code";
import {
	compactionOf,
	messageTokens,
	tokensOf,
} from "../../../../plugins/claudetto/modules/session/handoff/compact.ts";
import { TAIL_TOKENS } from "../../../../plugins/claudetto/modules/session/handoff/limits.ts";

const body = "x".repeat(4000);

test("the text of a tool result counts once when a call and its result hold it", () => {
	const both: SessionMessage = {
		role: "user",
		text: "",
		toolUses: [{ tool_use_id: "t1", tool: "Read", input: {}, text: body }],
		toolResults: [{ tool_use_id: "t1", text: body, isError: false }],
	};

	expect(messageTokens(both)).toBeLessThan(tokensOf(body) * 1.5);
	expect(messageTokens(both)).toBeGreaterThanOrEqual(tokensOf(body));
});

test("the text of a tool result counts once when the call row and the result row each hold it, as Claude Code saves them", () => {
	const call: SessionMessage = {
		role: "assistant",
		text: "",
		toolUses: [{ tool_use_id: "t1", tool: "Read", input: {}, text: body }],
	};
	const result: SessionMessage = {
		role: "user",
		text: "",
		toolUses: [],
		toolResults: [{ tool_use_id: "t1", text: body, isError: false }],
	};

	const total = messageTokens(call) + messageTokens(result);

	expect(total).toBeLessThan(tokensOf(body) * 1.5);
	expect(total).toBeGreaterThanOrEqual(tokensOf(body));
});

test("a tail over the budget gives no answer, and says why", () => {
	const messages: SessionMessage[] = [
		{ role: "user", text: "Start.", toolUses: [] },
		{
			role: "user",
			text: "x".repeat(4 * (TAIL_TOKENS + 1000)),
			toolUses: [],
		},
	];

	expect(typeof compactionOf(messages, "# Handoff")).toBe("string");
});

test("a tail that fits and halves the context gives the answer", () => {
	const big = (n: number): SessionMessage => ({
		role: "user",
		text: "x".repeat(n),
		toolUses: [],
	});

	const out = compactionOf([big(80_000), big(80_000), big(8000)], "# Handoff");

	expect(typeof out).toBe("object");
});
