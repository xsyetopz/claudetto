import { describe, expect, test } from "claude-code/testing";

import { CLEAR, type Dollar, engine, PAUSE, row, stateOf } from "./world";

const FEEDBACK = "Stop hook feedback:\n[x exists]: not yet";

/** One Stop-hook run that blocked; the goal's run ends with the engine's `goal_status` row. */
const block = async ($: Dollar, feedback: string, isGoal: boolean) => {
	await $.session.append(row("response", "working"));
	await $.session.append(row("note", feedback));
	if (isGoal) {
		await $.session.append(row("attachment", "", "goal_status"));
	}
	await $.session.append(row("notice", "", "stop_hook_summary"));
};

describe("goal set before claudetto loaded", () => {
	test("GOAL-033 the goal's first block makes it the session goal, and pause_goal pauses it", async ($, on) => {
		// Arrange
		const { ran, clock } = engine(on);
		await block($, FEEDBACK, true);

		// Act
		const { result } = await $.tool.call({ tool: PAUSE });
		await clock.advance(100);

		// Assert
		expect(result).toContain('Paused: "x exists"');
		expect(ran).toEqual(["clear"]);
	});

	test("GOAL-033 clear_goal ends a goal first seen at its block", async ($, on) => {
		// Arrange
		const { ran, clock } = engine(
			on,
			[],
			[
				{
					tool_use_id: "t1",
					tool: "Bash",
					input: { command: "test -e x" },
					text: "rc=0"
				}
			]
		);
		await block($, FEEDBACK, true);

		// Act
		const { result } = await $.tool.call({
			tool: CLEAR,
			condition: "x exists",
			checks: [{ command: "test -e x", outcome: "passed" }]
		});
		await clock.advance(100);

		// Assert
		expect(result).toContain("Goal cleared");
		expect(ran).toEqual(["clear"]);
	});

	test("GOAL-033 a settings Stop hook's block is no goal", async ($, on) => {
		// Arrange
		engine(on);

		// Act
		await block($, "Stop hook feedback:\n[./check.sh]: lint failed", false);

		// Assert
		expect(await stateOf($)).toBe("No goal is set.");
	});
});
