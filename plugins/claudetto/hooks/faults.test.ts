import type { On } from "claude-code";
import { type Engine, expect, mock, test } from "claude-code/testing";

const UNANSWERED_EXISTS = "no implementation for fs.exists";
const UNANSWERED_CALL = "no implementation for tool.call";
const UNANSWERED_RUN = "no implementation for process.run";

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

test("a check guard that throws asks with the failure text", async ($: Engine, on: On) => {
	lab(on);

	const out = await $.tool.check({
		tool: "Bash",
		input: { command: "rm -rf build" },
		tool_use_id: "c1",
	});

	expect(out.decision).toBe("ask");
	expect(out.reason).toContain(UNANSWERED_EXISTS);
});

test("a call guard that throws before the tool refuses, and the tool does not run", async ($: Engine, on: On) => {
	lab(on);
	const runs = beneath(on, "text");

	// A path that is no string makes the read guard throw before it calls `next`; parsed JSON is the one way to send it past the types.
	const malformed: unknown = JSON.parse('{"tool":"Read","tool_use_id":"c1"}');
	const out: unknown = await Reflect.apply($.tool.call, $.tool, [malformed]);

	expect(out).toMatchObject({ deny: expect.stringContaining("replaceAll") });
	expect(runs.count).toBe(0);
});

test("a call guard that throws after the tool withholds the result with the failure text", async ($: Engine, on: On) => {
	lab(on);
	const runs = beneath(on, "some text the scan would read");

	const out = await $.tool.call({
		tool: "Read",
		file_path: "/repo/a.ts",
		tool_use_id: "c1",
	});

	expect(runs.count).toBe(1);
	expect(out.deny).toContain(UNANSWERED_RUN);
	expect(out.result).toBeUndefined();
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
