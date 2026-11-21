import type { AgentInfo, AgentSpawnInput } from "claude-code";
import { describe, expect, test } from "claude-code/testing";

import { registerSpawn } from "../spawn";

const agent = (id: string, status: AgentInfo["status"]): AgentInfo => ({
	id,
	description: "x",
	type: "general-purpose",
	status,
	kind: "local_agent",
	taskStatus: "running",
	label: id,
	startTime: 0,
	cwd: "/work",
	tokenCount: 0,
	tokenSamples: [],
	hasRow: false
});

const spawn = (model: string): AgentSpawnInput => ({
	tool_use_id: "t1",
	prompt: "x",
	description: "x",
	subagentType: "general-purpose",
	provider: { plugin: "engine", tier: "core" },
	model,
	parentModel: "claude-opus-5-5",
	background: false,
	fork: false
});

describe("agent.spawn model bar", () => {
	test("refuses opus and fable by alias and id, naming Sonnet", async ($, on) => {
		// Arrange
		registerSpawn(on);

		// Act
		const results = await Promise.all(
			["opus", "claude-opus-5-5", "fable", "claude-fable-5-2"].map((model) =>
				$.agent.spawn(spawn(model))
			)
		);

		// Assert
		for (const r of results) {
			expect(r.deny).toMatch(/sonnet/u);
		}
	});

	test("refuses a spawn at the concurrent limit and says to wait", async ($, on) => {
		// Arrange
		on("agent.spawn", () => ({ model: "sonnet" }));
		on("agent.limits", () => ({
			value: { concurrent: 2, depth: 2, isBackgroundEnabled: true }
		}));
		on("agent.list", () => ({
			value: [
				agent("a", "running"),
				agent("b", "waiting"),
				agent("c", "completed")
			]
		}));

		// Act
		const result = await $.agent.spawn(spawn("sonnet"));

		// Assert
		expect(result.deny).toContain("Wait for one to finish");
		expect(result.deny?.length).toBeLessThanOrEqual(200);
	});

	test("lets a spawn through while a slot is free, ended agents not counted", async ($, on) => {
		// Arrange
		on("agent.spawn", () => ({ model: "sonnet" }));
		on("agent.limits", () => ({
			value: { concurrent: 2, depth: 2, isBackgroundEnabled: true }
		}));
		on("agent.list", () => ({
			value: [
				agent("a", "running"),
				agent("b", "completed"),
				agent("c", "failed")
			]
		}));

		// Act
		const result = await $.agent.spawn(spawn("sonnet"));

		// Assert
		expect(result.deny).toBeUndefined();
	});
});
