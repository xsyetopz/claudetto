import type { ModelForkResult, On } from "claude-code";
import { describe, expect, test } from "claude-code/testing";

import { VERBATIM_LIMIT } from "../text";
import { PENDING } from "../writer";

const FORKED: ModelForkResult = {
	isAnswered: true,
	text: "FORKED SUMMARY",
	usage: {
		input_tokens: 0,
		output_tokens: 0,
		cache_read_input_tokens: 0,
		cache_creation_input_tokens: 0
	}
};

interface Row {
	role: "user" | "assistant";
	text: string;
	toolUses: unknown[];
	toolResults?: unknown[];
}
const user = (text: string): Row => ({ role: "user", text, toolUses: [] });
const assistant = (text: string, toolUses: unknown[] = []): Row => ({
	role: "assistant",
	text,
	toolUses
});

function world(on: On, rows: Row[]) {
	const state: { forks: number; text: string } = { forks: 0, text: "" };
	on("env.get", () => ({ value: undefined }));
	on("ui.log", () => ({ value: undefined }));
	on("command.run", () => ({ text: "" }));
	on("store.set", (_$, e) => {
		if (e.key === PENDING) {
			state.text = String(e.value);
		}
		return { value: undefined };
	});
	on("ui.status", () => ({ value: undefined }));
	on("model.fork", () => {
		state.forks += 1;
		return { value: FORKED };
	});
	on("session.messages", () => ({ value: rows }));
	on("process.run", () => ({
		value: {
			exitCode: 0,
			stdout: "",
			stderr: "",
			isStdoutTruncated: false,
			isStderrTruncated: false
		}
	}));
	return state;
}

const RUN = {
	command: "clear",
	args: "",
	origin: { kind: "composer" },
	presentation: { isFullscreen: false, columns: 80 }
} as const;

describe("handover after one request", () => {
	test("a short one-request conversation is handed over whole with no fork", async ($, on) => {
		const state = world(on, [
			user("Rename foo to bar in util.ts."),
			assistant("Renamed it; the tests pass.")
		]);
		await $.command.run(RUN);
		const { text } = state;
		expect(state.forks).toBe(0);
		expect(text).toContain("Rename foo to bar in util.ts.");
		expect(text).toContain("Renamed it; the tests pass.");
	});
	test("the whole prompt and reply survive, uncut by the extract limits", async ($, on) => {
		const prompt = `start ${"p".repeat(2000)} end`;
		const reply = `start ${"r".repeat(3000)} end`;
		const state = world(on, [user(prompt), assistant(reply)]);
		await $.command.run(RUN);
		const { text } = state;
		expect(state.forks).toBe(0);
		expect(text).toContain(prompt);
		expect(text).toContain(reply);
	});
	test("a one-request conversation over the cap forks", async ($, on) => {
		const state = world(on, [user("q".repeat(VERBATIM_LIMIT)), assistant("a")]);
		await $.command.run(RUN);
		const { text } = state;
		expect(state.forks).toBe(1);
		expect(text).toContain("FORKED SUMMARY");
	});
	test("two requests fork", async ($, on) => {
		const state = world(on, [
			user("one"),
			assistant("first"),
			user("two"),
			assistant("second")
		]);
		await $.command.run(RUN);
		expect(state.forks).toBe(1);
	});
	test("a tool call forks even in a short conversation", async ($, on) => {
		const state = world(on, [
			user("read it"),
			assistant("reading", [{ id: "t1", name: "Read" }]),
			{ ...user(""), toolResults: [{ tool_use_id: "t1" }] },
			assistant("done")
		]);
		await $.command.run(RUN);
		expect(state.forks).toBe(1);
	});
});
