import type { PluginOptions } from "claude-code";

const WINDOW_SECONDS = 600;

const START_CAP = 12;

const CALL_CAP = 20;

const HEAVY_TOKENS = 400_000;

const FAIL_LIMIT = 3;

export interface Limits {
	readonly subagentCap: number | undefined;
	readonly startCap: number;
	readonly windowMs: number;
	readonly callCap: number;
	readonly heavyTokens: number;
	readonly failLimit: number;
}

const positive = <T extends number | undefined>(
	value: unknown,
	fallback: T,
): number | T => {
	const n = typeof value === "string" ? Number(value) : value;
	return typeof n === "number" && Number.isFinite(n) && n > 0 ? n : fallback;
};

export const limitsOf = (
	options: PluginOptions,
	planCap: number | undefined,
): Limits => ({
	subagentCap: positive(options["subagentCap"], planCap),
	startCap: positive(options["startCap"], START_CAP),
	windowMs: positive(options["windowSeconds"], WINDOW_SECONDS) * 1000,
	callCap: positive(options["callCap"], CALL_CAP),
	heavyTokens: positive(options["heavyTokens"], HEAVY_TOKENS),
	failLimit: positive(options["failLimit"], FAIL_LIMIT),
});
