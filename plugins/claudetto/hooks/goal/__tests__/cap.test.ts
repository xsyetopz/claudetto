import { describe, expect, test } from "claude-code/testing";

import { blocks, engine, setGoal, stateOf } from "./world";

describe("goal block cap", () => {
	test("GOAL-032 the block that reaches the cap pauses the goal and ends the turn, and one before it does neither", async ($, on) => {
		// Arrange
		engine(on, [], [], { CLAUDE_CODE_STOP_HOOK_BLOCK_CAP: "3" });
		const aborted: string[] = [];
		on("turn.abort", (_$, e) => {
			aborted.push(e.turnId);
			return { value: undefined };
		});
		on("turn.start", (_$, e) => ({ turnId: e.turnId }));
		await $.turn.start({ text: "go", turnId: "main" });
		await setGoal($, "x exists");
		const feedback = "Stop hook feedback:\n[x exists]: nope";
		await blocks($, 2, feedback);
		const before = [...aborted];

		// Act
		await blocks($, 1, feedback);

		// Assert
		expect(before).toEqual([]);
		expect(aborted).toEqual(["main"]);
		expect(await stateOf($)).toContain('Paused goal: "x exists"');
	});
});
