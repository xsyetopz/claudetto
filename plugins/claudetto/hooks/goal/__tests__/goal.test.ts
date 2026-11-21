import type { SessionAppendInput, ToolUseSummary } from "claude-code";
import {
	describe,
	expect,
	mock,
	test,
	type TestBody
} from "claude-code/testing";

type Dollar = Parameters<TestBody>[0];
type Mocks = Parameters<TestBody>[1];

const GET = "mcp__claudetto__get_goal";
const SET = "mcp__claudetto__set_goal";
const PAUSE = "mcp__claudetto__pause_goal";
const CLEAR = "mcp__claudetto__clear_goal";

/** The engine's answer to `/goal <condition>` (probed on 2.1.330). */
const engine = (
	on: Mocks,
	existing: readonly string[] = [],
	uses: readonly ToolUseSummary[] = [],
	registered: string[] = []
) => {
	const ran: string[] = [];
	on("command.run", (_$, e) => {
		ran.push(e.args);
		return {
			text: e.args === "clear" ? "Goal cleared" : `Goal set: ${e.args}`
		};
	});
	on("session.cwd", () => ({ value: "/work" }));
	on("fs.exists", (_$, e) => ({ value: existing.includes(e.path) }));
	on("session.messages", () => ({
		value: [{ role: "assistant", text: "", toolUses: [...uses] }]
	}));
	on("session.start", (_$, e) => ({ cwd: e.cwd }));
	on("tool.register", (_$, e) => {
		registered.push(e.description);
		return { value: { tool: e.name } };
	});
	on("ui.notify", () => ({
		value: { isSent: true, channel: "terminal_bell" }
	}));
	on("ui.log", () => ({ value: undefined }));
	on("env.get", () => ({ value: undefined }));
	// Advancing the clock runs a queued `/goal`.
	const clock = mock.clock(on);
	return { ran, clock };
};

const row = (
	door: SessionAppendInput["door"],
	text: string,
	name?: string
): SessionAppendInput => ({
	door,
	origin: { kind: "engine" },
	uuid: `u-${text.length}`,
	message: {
		type: door === "response" ? "assistant" : "user",
		content: [{ type: "text", text }],
		...(name === undefined ? {} : { name })
	}
});

const setGoal = ($: Dollar, args: string) =>
	$.command.run({
		command: "goal",
		args,
		origin: { kind: "composer" },
		presentation: { isFullscreen: false, columns: 80 }
	});

/** Appends `count` block rows one after another, as the engine does, and returns each answer. */
const blocks = async ($: Dollar, count: number, feedback: string) => {
	async function* rows() {
		for (let block = 1; block <= count; block += 1) {
			yield $.session.append(row("note", feedback));
		}
	}
	const answers: Awaited<ReturnType<Dollar["session"]["append"]>>[] = [];
	for await (const answer of rows()) {
		answers.push(answer);
	}
	return answers;
};

const stateOf = async ($: Dollar): Promise<string> => {
	const { result } = await $.tool.call({ tool: GET });
	return typeof result === "string" ? result : "";
};

describe("goal command", () => {
	test("warns when the condition names a path that does not exist", async ($, on) => {
		// Arrange
		engine(on, ["/work/there.ts"]);

		// Act
		const result = await setGoal($, "there.ts and gone/x.ts compile");

		// Assert
		expect(result.text).toContain("Goal set: there.ts and gone/x.ts compile");
		expect(result.text).toContain("gone/x.ts not found");
		expect(result.text).not.toContain("there.ts not found");
	});

	test("a condition without paths gets no warning and announces the goal tools", async ($, on) => {
		// Arrange
		engine(on);

		// Act
		const result = await setGoal($, "all tests pass");

		// Assert
		expect(result.text).toBe("Goal set: all tests pass");
		expect(result.context?.join("\n")).toContain("clear_goal");
	});
});

describe("goal stop cap", () => {
	test("adds a note to the block feedback from two blocks before the cap", async ($, on) => {
		// Arrange
		engine(on);
		await setGoal($, "x exists");
		const feedback = "Stop hook feedback:\n[x exists]: nope";

		// Act
		const outs = await blocks($, 8, feedback);
		const notes = outs.map((out) => JSON.stringify(out.message?.content));

		// Assert
		expect(notes[4]).not.toContain("claudetto");
		expect(notes[5]).toContain("6 times");
		expect(notes[7]).toContain("clear_goal");
	});

	test("a new prompt resets the count", async ($, on) => {
		// Arrange
		engine(on);
		await setGoal($, "x exists");
		const feedback = "Stop hook feedback:\n[x exists]: nope";
		await blocks($, 6, feedback);

		// Act
		await $.session.append(row("prompt", "next"));
		const out = await $.session.append(row("note", feedback));

		// Assert
		expect(JSON.stringify(out.message?.content)).not.toContain("claudetto");
	});

	test("a turn that stops with no block means the goal is met and clear_goal has nothing to do", async ($, on) => {
		// Arrange
		engine(on);
		await setGoal($, "x exists");

		// Act
		await $.session.append(row("response", "done"));
		await $.session.append(row("notice", "", "stop_hook_summary"));

		// Assert
		expect(await stateOf($)).toBe("No goal is set.");
	});
});

describe("goal tools", () => {
	test("set_goal queues /goal and get_goal reports it", async ($, on) => {
		// Arrange
		const { ran, clock } = engine(on);

		// Act
		const { result } = await $.tool.call({
			tool: SET,
			condition: "lint passes"
		});
		await clock.advance(100);

		// Assert
		expect(result).toContain("lint passes");
		expect(ran).toEqual(["lint passes"]);
		expect(await stateOf($)).toContain('Active goal: "lint passes"');
	});

	test("pause_goal clears the engine goal and keeps the condition", async ($, on) => {
		// Arrange
		const { ran, clock } = engine(on);
		await setGoal($, "lint passes");

		// Act
		await $.tool.call({ tool: PAUSE });
		await clock.advance(100);

		// Assert
		expect(ran).toEqual(["lint passes", "clear"]);
		expect(await stateOf($)).toContain('Paused goal: "lint passes"');
	});

	test("clear_goal refuses a failed check and clears a backed one", async ($, on) => {
		// Arrange
		const { ran, clock } = engine(
			on,
			[],
			[
				{
					tool_use_id: "t1",
					tool: "Bash",
					input: { command: "bun test" },
					text: "12 pass"
				}
			]
		);
		await setGoal($, "bun test passes");

		// Act
		const refused = await $.tool.call({
			tool: CLEAR,
			condition: "bun test passes",
			checks: [{ command: "bun test", outcome: "failed" }]
		});
		const cleared = await $.tool.call({
			tool: CLEAR,
			condition: "bun test passes",
			checks: [{ command: "bun test", outcome: "passed" }]
		});
		await clock.advance(100);

		// Assert
		expect(refused.result).toContain("Refused");
		expect(cleared.result).toContain("Goal cleared");
		expect(ran).toEqual(["bun test passes", "clear"]);
	});

	test("each tool description stays within 200 characters", async ($, on) => {
		// Arrange
		const registered: string[] = [];
		engine(on, [], [], registered);

		// Act
		await $.session.start({
			cwd: "/work",
			surface: null,
			isInteractive: false
		});

		// Assert
		expect(registered.length).toBeGreaterThanOrEqual(4);
		for (const description of registered) {
			expect(description.length).toBeLessThanOrEqual(200);
		}
	});
});
