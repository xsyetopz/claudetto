import type {
	ContextCategory,
	SessionContextBreakdown,
	SessionUsage
} from "claude-code";
import { describe, expect, test } from "claude-code/testing";

import { apportion } from "../../line/format";
import { chipRuns } from "../chip";
import { contextLines } from "../context";
import { limitLines } from "../limit";
import type { Line } from "../runs";

const NOW = Date.UTC(2026, 10, 25, 12, 0, 0);
const text = (line: Line | undefined): string =>
	(line ?? []).map((item) => item.text).join("");

const row = (
	name: string,
	tokens: number,
	color: string,
	kind: ContextCategory["kind"] = "used"
): ContextCategory => ({
	name,
	tokens,
	color,
	isDeferred: kind === "deferred",
	kind
});

const BREAKDOWN: SessionContextBreakdown = {
	categories: [
		row("System prompt", 20_000, "promptBorder"),
		row("Messages", 60_000, "purple_FOR_SUBAGENTS_ONLY"),
		row("Free space", 120_000, "promptBorder", "free"),
		row("MCP tools", 4000, "inactive", "deferred")
	],
	totalTokens: 80_000,
	maxTokens: 200_000,
	rawMaxTokens: 200_000,
	autocompactSource: "model-default",
	percentage: 40,
	gridRows: [],
	model: "claude-opus-5-5",
	memoryFiles: [],
	mcpTools: [],
	agents: [],
	isAutoCompactEnabled: true,
	apiUsage: null
};

describe("apportion", () => {
	test("splits cells by largest remainder so the parts sum to the cells", () => {
		// Act and Assert
		expect(apportion([1, 1, 1], 10)).toEqual([4, 3, 3]);
		expect(apportion([3, 1], 8)).toEqual([6, 2]);
		expect(apportion([0, 0], 5)).toEqual([0, 0]);
	});
});

describe("context view", () => {
	test("draws the window bar by row in /context's colours and lists each row with its share", () => {
		// Act
		const lines = contextLines(BREAKDOWN, 20);

		// Assert
		expect(text(lines[0])).toBe(
			"Context 80k of 200k 40% · local estimate, as /context counts"
		);
		expect(lines[1]).toEqual([
			{ text: "██", color: "promptBorder" },
			{ text: "██████", color: "purple_FOR_SUBAGENTS_ONLY" },
			{ text: "░░░░░░░░░░░░", color: "promptBorder" }
		]);
		expect(text(lines[3])).toBe("█ Messages         60k  30.0%");
		expect(lines.at(-1)?.[0]?.dim).toBe(true);
		expect(text(lines.at(-1))).toContain("MCP tools");
	});
});

describe("limit view", () => {
	test("splits the bar at the baseline and gives CodexBar's deficit and run-out", () => {
		// Arrange: half the 5h window is gone, 75 percent used, 30 of it before the session.
		const limit = {
			kind: "five_hour",
			percentUsed: 75,
			resetsAt: new Date(NOW + 9_000_000).toISOString()
		};
		const base = { kind: "five_hour", before: 30, since: NOW - 3_600_000 };

		// Act
		const lines = limitLines("five_hour", limit, base, NOW, 20);

		// Assert
		expect(text(lines[0])).toBe("5-hour window 75% used");
		expect(lines[1]).toEqual([
			{ text: "██████", color: "rate_limit_fill" },
			{ text: "█████████", color: "claude" },
			{ text: "░░░░░", color: "rate_limit_empty" }
		]);
		expect(text(lines[2])).toContain("since then +45%");
		expect(text(lines[3])).toBe("25% in deficit · expected 50% by now");
		expect(text(lines[4])).toStartWith("Runs out ");
		expect(text(lines[5])).toStartWith("Resets ");
	});

	test("says there is no reading when the window is absent", () => {
		// Act and Assert
		expect(
			text(limitLines("seven_day", undefined, undefined, NOW, 20)[1])
		).toContain("No reading yet");
	});
});

describe("band chips", () => {
	test("show a reading's bar and percent, and nothing for a window with no reading", () => {
		// Arrange
		const usage: SessionUsage = {
			startedAt: NOW,
			context: { window: 200_000, tokens: 80_000, percent: 40 },
			rateLimits: [{ kind: "five_hour", percentUsed: 50 }]
		};
		const parts = [{ color: "claude", tokens: 1 }];

		// Act
		const ctx = chipRuns("ctx", usage, parts, undefined, 10);
		const seven = chipRuns("seven_day", usage, undefined, undefined, 10);

		// Assert
		expect(ctx).toEqual([
			{ text: "████", color: "claude" },
			{ text: "░░░░░░", color: "rate_limit_empty" },
			{ text: " 40%", color: "success" }
		]);
		expect(seven).toBeUndefined();
	});
});
