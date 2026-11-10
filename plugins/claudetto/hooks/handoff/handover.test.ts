import { expect, test } from "claude-code/testing";

import {
	handOverTo,
	handoverTokens,
	isHandoff,
	newHandoverState,
} from "./handover.ts";

test("the handover threshold defaults to the lesser of 400,000 and half the window", () => {
	expect(handoverTokens({}, 1_000_000)).toBe(400_000);
	expect(handoverTokens({}, 300_000)).toBe(150_000);
});

test("handoverThresholdTokens sets the threshold when it is a positive number", () => {
	expect(handoverTokens({ handoverThresholdTokens: 250_000 }, 1_000_000)).toBe(
		250_000,
	);
	expect(handoverTokens({ handoverThresholdTokens: 0 }, 300_000)).toBe(150_000);
});

test("a reply that opens with the template's title is a handoff", () => {
	expect(isHandoff("# Handoff\n\n## Goal")).toBe(true);
	expect(isHandoff("Here is the handoff:\n# Handoff\n")).toBe(false);
});

const reply = "# Handoff\n\n## Goal\nship";

test("the compaction keeps the first message, an assistant line, and the handoff", () => {
	const state = newHandoverState();
	state.pending = reply;

	const result = handOverTo(state, {
		trigger: "auto",
		messages: [
			{ role: "user", text: "first", toolUses: [] },
			{ role: "assistant", text: "x", toolUses: [] },
		],
	});

	expect(result?.messages?.map((m) => m.role)).toEqual([
		"user",
		"assistant",
		"user",
	]);
	expect(result?.messages?.[2]?.text).toBe(reply);
});

test("a subagent's compaction and a precompute leave the pending handoff alone", () => {
	const state = newHandoverState();
	state.pending = reply;

	expect(
		handOverTo(state, { trigger: "auto", agentId: "a", messages: [] }),
	).toBeUndefined();
	expect(
		handOverTo(state, { trigger: "precompute", messages: [] }),
	).toBeUndefined();
	expect(state.pending).toBe(reply);
});
