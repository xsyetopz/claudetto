import type { ToolUseSummary } from "claude-code";
import { describe, expect, test } from "claude-code/testing";

import {
	CLEAR,
	type Dollar,
	engine,
	GET,
	type Mocks,
	PAUSE,
	setGoal,
	stateOf
} from "./world";

/** A Bash result in the transcript, failed when `isError` is set. */
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

describe("goal clear evidence", () => {
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
