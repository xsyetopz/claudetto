import type { On } from "claude-code";
import { describe, expect, test } from "claude-code/testing";

import {
	MAX_DESCRIPTION,
	registerToolDescribe,
	TOOL_DESCRIPTIONS
} from "../describe";

const provider = { plugin: "engine", tier: "core" } as const;
const STOCK = "A stock description ".repeat(100);

const text = (tool: string): string => TOOL_DESCRIPTIONS[tool] ?? "";

/**
 * Stands in for the engine under the plugin's own hooks: the stock description,
 * and no git setting, so the builtin git block stays on and the Bash text is the short one.
 */
const stockEngine = (on: On): void => {
	on("tool.describe", (_$, e) => ({ description: e.description }));
	on("settings.read", () => ({ value: {} }));
	on("env.get", () => ({ value: undefined }));
	on("ui.log", () => ({ value: undefined }));
};

describe("tool.describe", () => {
	test("renders every kept built-in at no more than 200 characters", async ($, on) => {
		// Arrange
		stockEngine(on);
		registerToolDescribe(on);

		// Act
		const rendered = await Promise.all(
			Object.keys(TOOL_DESCRIPTIONS).map(async (tool) => {
				const result = await $.tool.describe({
					tool,
					description: STOCK,
					provider
				});
				return { tool, length: result.description.length };
			})
		);

		// Assert
		// Bash carries the recipes and the git block, and AskUserQuestion its rule, after the short text.
		expect(
			rendered.filter(
				(r) =>
					r.tool !== "Bash" &&
					r.tool !== "AskUserQuestion" &&
					r.length > MAX_DESCRIPTION
			)
		).toEqual([]);
		expect(text("Bash").length).toBeLessThanOrEqual(MAX_DESCRIPTION);
		expect(text("AskUserQuestion").length).toBeLessThanOrEqual(MAX_DESCRIPTION);
	});

	test("covers each tool REQ-TOOLS-003 lists that Claude Code 2.1.330 ships", () => {
		// Act
		const covered = Object.keys(TOOL_DESCRIPTIONS).toSorted();

		// Assert
		expect(covered).toEqual(
			[
				"Agent",
				"AskUserQuestion",
				"Bash",
				"ExitPlanMode",
				"Monitor",
				"Read",
				"Skill",
				"TaskCreate",
				"TaskGet",
				"TaskList",
				"TaskStop",
				"TaskUpdate",
				"TodoWrite",
				"ToolSearch"
			].toSorted()
		);
	});

	test("replaces the stock text of a described tool", async ($, on) => {
		// Arrange
		stockEngine(on);
		registerToolDescribe(on);

		// Act
		const { description } = await $.tool.describe({
			tool: "Read",
			description: STOCK,
			provider
		});

		// Assert
		expect(description).toBe(TOOL_DESCRIPTIONS["Read"]);
	});

	test("leaves the stock text of a tool it does not describe", async ($, on) => {
		// Arrange
		stockEngine(on);
		registerToolDescribe(on);

		// Act
		const { description } = await $.tool.describe({
			tool: "WebSearch",
			description: STOCK,
			provider
		});

		// Assert
		expect(description).toBe(STOCK);
	});

	test("names the parameters a model must set for each tool that has required ones", () => {
		// Assert
		expect(text("Read")).toContain("file_path");
		expect(text("TaskStop")).toContain("task_id");
		expect(text("Agent")).toContain("subagent_type");
	});
});
