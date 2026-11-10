import type { PluginOptions } from "claude-code";

export const usage = (tokens: number) => ({
	startedAt: 0,
	context: { tokens, window: 1_000_000, percent: 0 },
	rateLimits: [],
});

export const set = (options: PluginOptions): { options: PluginOptions } => ({
	options,
});
