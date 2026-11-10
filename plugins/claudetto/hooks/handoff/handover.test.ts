import type { ModelForkResult } from "claude-code";
import { expect, test } from "claude-code/testing";

import {
	afterTurn,
	handOverTo,
	handoverTokens,
	isHandoff,
	newHandoverState,
	type Session,
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

const USAGE = {
	input_tokens: 0,
	output_tokens: 0,
	cache_read_input_tokens: 0,
	cache_creation_input_tokens: 0,
};

/** `compact` stands in for the engine: it raises the compaction the plugin's hook answers. */
const fake = (
	context: { tokens?: number; window: number },
	fork: (calls: string[]) => ModelForkResult = () => ({
		isAnswered: true,
		text: reply,
		usage: USAGE,
	}),
	state = newHandoverState(),
	answered = true,
) => {
	const calls: string[] = [];
	const files: string[] = [];
	const session: Session = {
		redact: (text) => Promise.resolve(text),
		write: (_path, text) => {
			files.push(text);
			return Promise.resolve();
		},
		compact: () => {
			calls.push("compact");
			if (answered) {
				handOverTo(state, { trigger: "manual", messages: [] });
			}
			return Promise.resolve();
		},
		submit: (text) => {
			calls.push(`submit:${text}`);
			return Promise.resolve();
		},
		log: (line) => {
			calls.push(`log:${line}`);
		},
		context: () => Promise.resolve(context),
		fork: () => {
			calls.push("fork");
			return Promise.resolve(fork(calls));
		},
	};
	return { session, calls, files, state };
};

const unanswered = (): ModelForkResult => ({
	isAnswered: true,
	text: "no",
	usage: USAGE,
});

test("a reply with the title is saved, compacts, and the next prompt goes in", async () => {
	const { session, calls, files, state } = fake({ tokens: 1, window: 1e6 });

	await afterTurn(session, state, reply, {});

	expect(files).toEqual([reply]);
	expect(calls[0]).toBe("compact");
	expect(calls[1]).toContain("submit:");
});

test("a reply without the title starts no compaction", async () => {
	const { session, calls, state } = fake({ tokens: 1, window: 1e6 });

	await afterTurn(session, state, "done", {});

	expect(calls).toEqual([]);
});

test("a context of 400,000 tokens forks, hands over, and leaves the next prompt to the user", async () => {
	const { session, calls, files, state } = fake({
		tokens: 400_000,
		window: 1e6,
	});

	await afterTurn(session, state, "done", {});

	expect(calls).toEqual(["fork", "compact"]);
	expect(files).toEqual([reply]);
});

test("a context under half of a small window forks nothing", async () => {
	const { session, calls, state } = fake({ tokens: 149_999, window: 300_000 });

	await afterTurn(session, state, "done", {});

	expect(calls).toEqual([]);
});

test("a context at half of a small window forks", async () => {
	const { session, calls, state } = fake({ tokens: 150_000, window: 300_000 });

	await afterTurn(session, state, "done", {});

	expect(calls[0]).toBe("fork");
});

test("a fork that answers without the title starts no compaction and logs one line", async () => {
	const { session, calls, state } = fake(
		{ tokens: 500_000, window: 1e6 },
		unanswered,
	);

	await afterTurn(session, state, "done", {});

	expect(calls).toHaveLength(2);
	expect(calls[1]).toContain("log:");
});

test("after a fork without a handoff, no turn's end forks again until a compaction", async () => {
	const { session, calls, state } = fake(
		{ tokens: 500_000, window: 1e6 },
		unanswered,
	);

	await afterTurn(session, state, "a", {});
	await afterTurn(session, state, "b", {});
	expect(calls.filter((call) => call === "fork")).toHaveLength(1);

	handOverTo(state, { trigger: "auto", messages: [] });
	await afterTurn(session, state, "c", {});
	expect(calls.filter((call) => call === "fork")).toHaveLength(2);
});

test("a turn after a handover that ends still at the size forks nothing and logs one line", async () => {
	const { session, calls, state } = fake({ tokens: 500_000, window: 1e6 });

	await afterTurn(session, state, reply, {});
	calls.length = 0;
	await afterTurn(session, state, "still big", {});

	expect(calls).toHaveLength(1);
	expect(calls[0]).toContain("still over");
});

test("a refused next prompt logs one line that says the compaction stands", async () => {
	const { session, calls, state } = fake({ tokens: 1, window: 1e6 });
	const refusing: Session = {
		...session,
		submit: () => Promise.reject(new Error("refused")),
	};

	await afterTurn(refusing, state, reply, {});

	expect(
		calls.filter((call) => call.includes("The conversation was compacted")),
	).toHaveLength(1);
});

test("a compaction answered elsewhere submits no prompt and logs one line", async () => {
	const { session, calls, state } = fake(
		{ tokens: 1, window: 1e6 },
		undefined,
		undefined,
		false,
	);

	await afterTurn(session, state, reply, {});

	expect(calls.filter((call) => call.startsWith("submit:"))).toEqual([]);
	expect(
		calls.filter((call) => call.includes("answered elsewhere")),
	).toHaveLength(1);
});

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
