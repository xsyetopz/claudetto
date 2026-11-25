import type { ContextCategory } from "claude-code";
import { describe, expect, test } from "claude-code/testing";

import { baselinesAfter, partsOf } from "../baseline";
import { readState, writeState } from "../line/state";

const NOW = Date.UTC(2026, 10, 25, 12, 0, 0);
const RESET = "2026-11-25T15:00:00.000Z";
const RESET_S = Date.parse(RESET) / 1000;

describe("rate-limit baselines", () => {
	test("a window seen first keeps its use as before, and a spend limit gets none", () => {
		// Act
		const out = baselinesAfter(
			[],
			[
				{ kind: "five_hour", percentUsed: 40, resetsAt: RESET },
				{ kind: "spend_limit", percentUsed: 10 }
			],
			NOW
		);

		// Assert
		expect(out).toEqual([
			{ kind: "five_hour", before: 40, since: NOW, resetsAt: RESET_S }
		]);
	});

	test("keeps a baseline while the reset holds, and drops before to 0 once it moves", () => {
		// Arrange
		const kept = [
			{ kind: "five_hour", before: 40, since: NOW, resetsAt: RESET_S }
		];

		// Act
		const same = baselinesAfter(
			kept,
			[
				{
					kind: "five_hour",
					percentUsed: 55,
					resetsAt: "2026-11-25T15:00:30.000Z"
				}
			],
			NOW + 1000
		);
		const moved = baselinesAfter(
			kept,
			[
				{
					kind: "five_hour",
					percentUsed: 3,
					resetsAt: "2026-11-25T20:00:00.000Z"
				}
			],
			NOW + 1000
		);

		// Assert
		expect(same).toEqual(kept);
		expect(moved).toEqual([
			{ kind: "five_hour", before: 0, since: NOW, resetsAt: RESET_S + 18_000 }
		]);
	});

	test("keeps a window the reading leaves out", () => {
		// Arrange
		const kept = [{ kind: "seven_day", before: 20, since: NOW }];

		// Act and Assert
		expect(baselinesAfter(kept, [], NOW)).toEqual(kept);
	});
});

/** A /context row; Messages in its own colour, the rest in the prompt border. */
const row = (
	name: string,
	tokens: number,
	kind: ContextCategory["kind"],
	isDeferred = false
): ContextCategory => ({
	name,
	tokens,
	color: name === "Messages" ? "purple_FOR_SUBAGENTS_ONLY" : "promptBorder",
	isDeferred,
	kind
});

describe("context parts", () => {
	test("are the used rows in the window, in /context's colours", () => {
		// Act
		const parts = partsOf([
			row("System prompt", 3000, "used"),
			row("Messages", 9000, "used"),
			row("Skills", 0, "used"),
			row("MCP tools", 500, "deferred", true),
			row("Free space", 150_000, "free")
		]);

		// Assert
		expect(parts).toEqual([
			{ color: "promptBorder", tokens: 3000 },
			{ color: "purple_FOR_SUBAGENTS_ONLY", tokens: 9000 }
		]);
	});

	test("round-trip through the state file with the baselines", () => {
		// Arrange
		const state = {
			phase: "idle" as const,
			agents: [],
			finished: [],
			tools: 0,
			tasks: [],
			context: [{ color: "claude", tokens: 1200 }],
			limits: [{ kind: "five_hour", before: 12, since: NOW, resetsAt: RESET_S }]
		};

		// Act and Assert
		expect(readState(writeState(state))).toEqual(state);
	});
});
