import type { On } from "claude-code";
import { describe, expect, test } from "claude-code/testing";

import { registerToolDescribe } from "../describe";

const provider = { plugin: "engine", tier: "core" } as const;
const STOCK = "A stock description ".repeat(100);

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
		expect(description).not.toBe(STOCK);
		expect(description).not.toBe("");
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

	test("DELEGATION-072 the Agent text names the concurrent subagent limit the environment sets", async ($, on) => {
		// Arrange
		on("tool.describe", (_$, e) => ({ description: e.description }));
		on("env.get", (_$, e) => ({
			value: e.name === "CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS" ? "7" : undefined
		}));
		registerToolDescribe(on);

		// Act
		const { description } = await $.tool.describe({
			tool: "Agent",
			description: STOCK,
			provider
		});

		// Assert
		expect(description).toMatch(/\b7\b/u);
	});
});
