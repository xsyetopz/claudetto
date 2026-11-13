import type { AgentSpawnInput, On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

const SPAWN: AgentSpawnInput = {
	tool_use_id: "toolu_1",
	prompt: "Read README.md.",
	description: "read",
	subagentType: "claudetto:Heracles",
	provider: { plugin: "claudetto", tier: "core" },
	parentModel: "claude-opus-5-5",
	background: false,
	fork: false,
};

test("a spawn event with model opus reaches next with no model", async ($: Engine, on: On) => {
	const seen: AgentSpawnInput[] = [];
	on("fs.exists", () => ({ value: false }));
	on("agent.spawn", (_$, e) => {
		seen.push(e);
		return { model: "claude-sonnet-5-5" };
	});

	await $.agent.spawn({ ...SPAWN, model: "opus" });

	expect(seen).toHaveLength(1);
	expect(seen[0]).not.toHaveProperty("model");
	expect(seen[0]?.prompt).toBe(SPAWN.prompt);
});
