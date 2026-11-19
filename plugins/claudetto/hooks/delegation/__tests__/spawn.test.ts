import type { AgentSpawnInput } from "claude-code";
import { describe, expect, test } from "claude-code/testing";

import { registerSpawn } from "./spawn";

const spawn = (model: string): AgentSpawnInput => ({
	tool_use_id: "t1",
	prompt: "x",
	description: "x",
	subagentType: "general-purpose",
	provider: { plugin: "engine", tier: "core" },
	model,
	parentModel: "claude-opus-5-5",
	background: false,
	fork: false,
});

describe("agent.spawn model bar", () => {
	test("refuses opus and fable by alias and id, naming Sonnet", async ($, on) => {
		// Arrange
		registerSpawn(on);

		// Act
		const results = await Promise.all(
			["opus", "claude-opus-5-5", "fable", "claude-fable-5-2"].map((model) => $.agent.spawn(spawn(model))),
		);

		// Assert
		for (const r of results) expect(r.deny).toMatch(/sonnet/u);
	});
});
