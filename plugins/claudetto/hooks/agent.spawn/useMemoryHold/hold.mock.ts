import type { AgentSpawnInput, PluginOptions } from "claude-code";

export const SPAWN: AgentSpawnInput = {
	tool_use_id: "toolu_1",
	prompt: "Read README.md.",
	description: "read",
	subagentType: "claudetto:work",
	provider: { plugin: "claudetto", tier: "core" },
	parentModel: "opus",
	background: false,
	fork: false,
};

export const usage = (tokens: number) => ({
	startedAt: 0,
	context: { tokens, window: 1_000_000, percent: 0 },
	rateLimits: [],
});

export const set = (options: PluginOptions): { options: PluginOptions } => ({
	options,
});
