// The limits of a run and where each one is read. The defaults are those of the two licensed
// sources, each with its line in `design.md`, "Run Limits", and the user overrides any of them in
// `userConfig`. Pure over the options, so a test hands it a plain object.

import type { PluginOptions } from "claude-code";

/** `agent-usage-guard` `core/config.ts`: the length of the period, in seconds (line 63). */
const WINDOW_SECONDS = 600;

/** `agent-usage-guard` `core/config.ts`: subagent starts per period, `rollingMax` (line 65). */
const START_CAP = 12;

/** `agent-usage-guard` `core/config.ts`: tool calls per period at heavy context, `toolMax` (line 74). */
const CALL_CAP = 20;

/** `agent-usage-guard` `core/config.ts`: the context from which it counts as heavy, `toolContext` (line 73). */
const HEAVY_TOKENS = 400_000;

/** `loop-breaker` `hooks/register.tsx`: identical failures before a retry is refused (line 30). */
const FAIL_LIMIT = 3;

/** The resolved limits of a run, as `limitsOf` returns them; `windowMs` is in milliseconds, where the option `windowSeconds` is in seconds. */
export interface Limits {
	/** The subagents at once, or none when neither the option nor a plan row gives one. */
	readonly subagentCap: number | undefined;
	readonly startCap: number;
	readonly windowMs: number;
	readonly callCap: number;
	readonly heavyTokens: number;
	readonly failLimit: number;
}

/** A positive number, from a number or a numeric string, or the fallback for anything else. */
const positive = <T extends number | undefined>(
	value: unknown,
	fallback: T,
): number | T => {
	const n = typeof value === "string" ? Number(value) : value;
	return typeof n === "number" && Number.isFinite(n) && n > 0 ? n : fallback;
};

/**
 * The limits for the `userConfig` values of the plugin. A missing, non-numeric, or non-positive
 * value gives the default. `planCap` is the cap of the plan row, the starting value of
 * `subagentCap` (`design.md`, "Run Limits"), and it is absent for a login the table has no row for.
 */
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
