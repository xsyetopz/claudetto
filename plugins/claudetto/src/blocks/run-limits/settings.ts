import type { PluginOptions } from "claude-code";
import { optionOf } from "../../shared/option.ts";

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

/**
 * The subagent cap is Claude Code's own `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS`, which a user sets in the `env` setting.
 * A `subagentCap` stored before that option was dropped still counts when the env sets none.
 */
export const limitsOf = (
	options: PluginOptions,
	planCap: number | undefined,
	claudeCap?: number,
): Limits => ({
	subagentCap: positive(claudeCap, positive(options["subagentCap"], planCap)),
	startCap: positive(
		optionOf(options, "maxSubagentStarts", "startCap"),
		START_CAP,
	),
	windowMs:
		positive(
			optionOf(options, "limitPeriodSeconds", "windowSeconds"),
			WINDOW_SECONDS,
		) * 1000,
	callCap: positive(
		optionOf(options, "maxHeavyToolCalls", "callCap"),
		CALL_CAP,
	),
	heavyTokens: positive(
		optionOf(options, "heavyContextTokens", "heavyTokens"),
		HEAVY_TOKENS,
	),
	failLimit: positive(
		optionOf(options, "maxIdenticalFailures", "failLimit"),
		FAIL_LIMIT,
	),
});
