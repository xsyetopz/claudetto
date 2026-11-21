import { describe, expect, test } from "claude-code/testing";

import { claimOf, judgeClaim, type Use } from "../evidence";

const GOAL = "bun test passes";
const RAN: Use = {
	tool: "Bash",
	input: { command: "bun test" },
	text: "12 pass"
};
const claim = (outcome: "passed" | "failed") =>
	claimOf(GOAL, [{ command: "bun test", outcome }]);

describe("goal evidence", () => {
	test("accepts a claim with a passing check that a tool result backs", () => {
		// Arrange and Act
		const verdict = judgeClaim(GOAL, claim("passed"), [RAN]);

		// Assert
		expect(verdict).toEqual({ ok: true });
	});

	test("refuses a claim whose last check failed", () => {
		// Arrange and Act
		const verdict = judgeClaim(GOAL, claim("failed"), [RAN]);

		// Assert
		expect(verdict.ok).toBe(false);
	});

	test("refuses a claim with no checks, and one for another condition", () => {
		// Arrange
		const bare = claimOf(GOAL, []);
		const other = claimOf("lint passes", [{ command: "x", outcome: "passed" }]);

		// Act and Assert
		expect(judgeClaim(GOAL, bare, [RAN]).ok).toBe(false);
		expect(judgeClaim(GOAL, other, [RAN]).ok).toBe(false);
	});

	test("refuses when no tool result backs it, goal tools excluded", () => {
		// Arrange
		const goalTool: Use = {
			tool: "mcp__claudetto__get_goal",
			input: {},
			text: "Active goal"
		};

		// Act
		const verdict = judgeClaim(GOAL, claim("passed"), [goalTool]);

		// Assert
		expect(verdict.ok).toBe(false);
	});

	test("refuses when a cited Bash command errored in the transcript", () => {
		// Arrange
		const failed: Use = { ...RAN, text: "1 fail", isError: true };

		// Act
		const verdict = judgeClaim(GOAL, claim("passed"), [failed]);

		// Assert
		expect(verdict.ok).toBe(false);
	});

	test("drops malformed checks while reading a claim", () => {
		// Arrange and Act
		const read = claimOf(GOAL, [
			{ command: "a", outcome: "passed" },
			{ command: 1, outcome: "passed" },
			{ command: "b", outcome: "maybe" },
			null
		]);

		// Assert
		expect(read.checks).toEqual([{ command: "a", outcome: "passed" }]);
	});
});
