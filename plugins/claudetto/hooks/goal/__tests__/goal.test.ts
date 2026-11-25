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
	env: Record<string, string> = {}
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
	on("ui.notify", () => ({
		value: { isSent: true, channel: "terminal_bell" }
	}));
	on("ui.log", () => ({ value: undefined }));
	on("env.get", (_$, e) => ({ value: env[e.name] }));
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

	test("a block after pause_goal ends the main turn, and one before it does not", async ($, on) => {
		// Arrange
		engine(on);
		const aborted: string[] = [];
		on("turn.abort", (_$, e) => {
			aborted.push(e.turnId);
			return { value: undefined };
		});
		on("turn.start", (_$, e) => ({ turnId: e.turnId }));
		await $.turn.start({ text: "go", turnId: "main" });
		await $.turn.start({ text: "", turnId: "sub", agentId: "a1" });
		await setGoal($, "x exists");
		const feedback =
			"Stop hook feedback:\n[x exists]: the user has not confirmed";
		await $.session.append(row("note", feedback));
		const before = [...aborted];

		// Act
		await $.tool.call({ tool: PAUSE });
		await $.session.append(row("note", feedback));

		// Assert
		expect(before).toEqual([]);
		expect(aborted).toEqual(["main"]);
	});

	test("pause_goal runs without the engine's ask, and set_goal and a settings rule keep theirs", async ($, on) => {
		// Arrange
		engine(on);
		on("tool.check", (_$, e) =>
			e.tool === CLEAR
				? { decision: "ask", rule: "mcp__claudetto__clear_goal" }
				: { decision: "ask" }
		);

		// Act
		const pause = await $.tool.check({ tool: PAUSE, input: {} });
		const set = await $.tool.check({ tool: SET, input: { condition: "x" } });
		const ruled = await $.tool.check({ tool: CLEAR, input: {} });

		// Assert
		expect(pause.decision).toBe("allow");
		expect(set.decision).toBe("ask");
		expect(ruled.decision).toBe("ask");
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
});

describe("goal command paths", () => {
	test("a path named twice is reported once, and each missing path is reported", async ($, on) => {
		// Arrange
		engine(on);

		// Act
		const result = await setGoal(
			$,
			"src/a.ts and ./b/c.md pass; README.md lists src/a.ts"
		);

		// Assert
		expect(result.text).toContain("src/a.ts, ./b/c.md, README.md not found");
	});

	test("versions, URLs, hosts and abbreviations are not taken for paths", async ($, on) => {
		// Arrange
		engine(on);
		const condition =
			"the file x exists on v2.1.330, e.g. see https://example.com/a/b and example.com";

		// Act
		const result = await setGoal($, condition);

		// Assert
		expect(result.text).toBe(`Goal set: ${condition}`);
	});
});

describe("goal stop cap setting", () => {
	const FEEDBACK = "Stop hook feedback:\n[x exists]: nope";

	const notesWith = async (
		$: Dollar,
		on: Mocks,
		cap: string,
		count: number
	): Promise<string[]> => {
		engine(on, [], [], { CLAUDE_CODE_STOP_HOOK_BLOCK_CAP: cap });
		await setGoal($, "x exists");
		const outs = await blocks($, count, FEEDBACK);
		return outs.map((out) => JSON.stringify(out.message?.content));
	};

	test("a cap in the environment moves the warning", async ($, on) => {
		// Act
		const notes = await notesWith($, on, "4", 3);

		// Assert
		expect(notes[0]).not.toContain("times in a row");
		expect(notes[1]).toContain("2 times");
	});

	test("a cap of 0 never warns", async ($, on) => {
		// Act
		const notes = await notesWith($, on, "0", 12);

		// Assert
		expect(notes.some((note) => note.includes("times in a row"))).toBe(false);
	});

	test("an unreadable cap warns as the default cap does", async ($, on) => {
		// Act
		const notes = await notesWith($, on, "abc", 8);

		// Assert
		expect(notes[4]).not.toContain("times in a row");
		expect(notes[5]).toContain("6 times");
	});
});

describe("goal clear evidence", () => {
	const bash = (text: string, isError?: true): ToolUseSummary => ({
		tool_use_id: `t-${text}`,
		tool: "Bash",
		input: { command: "bun test" },
		text,
		...(isError === undefined ? {} : { isError })
	});
	const passed = [{ command: "bun test", outcome: "passed" }];

	const clearWith = async (
		$: Dollar,
		on: Mocks,
		uses: readonly ToolUseSummary[],
		checks: unknown,
		condition = "bun test passes"
	): Promise<string> => {
		engine(on, [], uses);
		await setGoal($, "bun test passes");
		const { result } = await $.tool.call({ tool: CLEAR, condition, checks });
		return String(result);
	};

	test("a passing check that a Bash result backs clears the goal", async ($, on) => {
		// Act
		const result = await clearWith($, on, [bash("12 pass")], passed);

		// Assert
		expect(result).toContain("Goal cleared");
	});

	test("a claim with no checks is refused", async ($, on) => {
		// Act
		const result = await clearWith($, on, [bash("12 pass")], []);

		// Assert
		expect(result).toContain("Refused");
	});

	test("a claim for another condition is refused", async ($, on) => {
		// Act
		const result = await clearWith(
			$,
			on,
			[bash("12 pass")],
			passed,
			"lint passes"
		);

		// Assert
		expect(result).toContain("Refused");
	});

	test("malformed checks are dropped, and a claim left with none is refused", async ($, on) => {
		// Act
		const result = await clearWith(
			$,
			on,
			[bash("12 pass")],
			[
				{ command: 1, outcome: "passed" },
				{ command: "bun test", outcome: "maybe" }
			]
		);

		// Assert
		expect(result).toContain("Refused");
	});

	test("a passed check with no Bash result in the transcript is refused", async ($, on) => {
		// Act
		const none = await clearWith($, on, [], passed);

		// Assert
		expect(none).toContain("Refused");
	});

	test("a goal tool's own result does not back a check", async ($, on) => {
		// Arrange
		const goalTool: ToolUseSummary = {
			tool_use_id: "g1",
			tool: GET,
			input: { command: "bun test" },
			text: "Active goal"
		};

		// Act
		const result = await clearWith($, on, [goalTool], passed);

		// Assert
		expect(result).toContain("Refused");
	});

	test("a cited Bash command that errored is refused", async ($, on) => {
		// Act
		const result = await clearWith($, on, [bash("1 fail", true)], passed);

		// Assert
		expect(result).toContain("Refused");
	});

	test("a check whose newest run passed after an earlier one errored clears", async ($, on) => {
		// Act
		const result = await clearWith(
			$,
			on,
			[bash("1 fail", true), bash("12 pass")],
			passed
		);

		// Assert
		expect(result).toContain("Goal cleared");
	});
});

describe("goal after pause", () => {
	test("a new goal replaces the paused one in get_goal", async ($, on) => {
		// Arrange
		const { clock } = engine(on);
		await setGoal($, "tests pass");
		await $.tool.call({ tool: PAUSE });
		await clock.advance(100);

		// Act
		await setGoal($, "lint passes");

		// Assert
		const state = await stateOf($);
		expect(state).toContain('Active goal: "lint passes"');
		expect(state).not.toContain("Paused");
	});
});
