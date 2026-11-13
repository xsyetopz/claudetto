import type { On } from "claude-code";
import { type Engine, expect, mock, test } from "claude-code/testing";

import { scanner } from "./secrets.mock";

const UNANSWERED_CALL = "no implementation for tool.call";

/** The answers every guard of `tool.check` needs, so a call reaches `tool.call`. */
const lab = (on: On) => {
	mock.clock(on, { now: 0 });
	on("session.usage", () => ({
		value: {
			startedAt: 0,
			context: { tokens: 0, window: 1_000_000, percent: 0 },
			rateLimits: [],
		},
	}));
	on("tool.check", () => ({ decision: "allow" }));
};

/** A `tool.call` stand-in beneath the plugin that counts its runs and answers `answer`, or throws it. */
const beneath = (on: On, answer: unknown) => {
	const runs = { count: 0 };
	on("tool.call", () => {
		runs.count++;
		if (answer instanceof Error) {
			throw answer;
		}
		return { result: answer };
	});
	return runs;
};

test("a check guard that throws leaves the verdict beneath", async ($: Engine, on: On) => {
	lab(on);

	const out = await $.tool.check({
		tool: "Bash",
		input: { command: "rm -rf build" },
		tool_use_id: "c1",
	});

	expect(out.decision).toBe("allow");
});

test("a call guard that throws before the tool refuses, and the tool does not run", async ($: Engine, on: On) => {
	lab(on);
	const runs = beneath(on, "text");

	on("session.root", () => {
		throw new Error("no root");
	});

	const out = await $.tool.call({
		tool: "Bash",
		command: "git status",
		tool_use_id: "c1",
	});

	expect(out).toMatchObject({ deny: expect.stringContaining("session.root") });
	expect(runs.count).toBe(0);
});

test("a call guard that throws after the tool returns the tool's result", async ($: Engine, on: On) => {
	lab(on);
	scanner(on);
	on("session.root", () => ({ value: "/repo" }));
	// The sandbox git guard checks `.git` before and after the tool, so the second check throws after the tool ran.
	let checks = 0;
	let exists = (): { value: boolean } => {
		exists = () => {
			throw new Error("after the tool");
		};
		return { value: false };
	};
	on("fs.exists", () => {
		checks++;
		return exists();
	});
	const runs = beneath(on, "some text the scan would read");

	const out = await $.tool.call({
		tool: "Bash",
		command: "true",
		tool_use_id: "c1",
	});

	expect(checks).toBeGreaterThan(1);
	expect(runs.count).toBe(1);
	expect(out.deny).toBeUndefined();
	expect(out.result).toBe("some text the scan would read");
});

test("a tool that fails beneath the plugin reaches the caller as its own failure", async ($: Engine, on: On) => {
	lab(on);
	const runs = beneath(on, new Error("the tool broke"));

	// The engine skips a hook that throws, so what the caller meets is the unanswered call beneath, not a refusal.
	await expect(
		$.tool.call({ tool: "Read", file_path: "/repo/a.ts", tool_use_id: "c1" }),
	).rejects.toThrow(UNANSWERED_CALL);
	expect(runs.count).toBe(1);
});
