import type { AgentInfo, PluginOptions } from "claude-code";

import { numberOption } from "../options.ts";
import {
	DENY_CALLS,
	DENY_FAILED,
	DENY_STARTS,
	DENY_SUBAGENTS,
} from "../texts.ts";

export interface Limits {
	readonly startCap: number;
	readonly windowMs: number;
	readonly callCap: number;
	readonly heavyTokens: number;
	readonly failLimit: number;
}

export const limitsOf = (options: PluginOptions): Limits => ({
	startCap: numberOption(options, "maxSubagentStarts", 12),
	windowMs: numberOption(options, "limitPeriodSeconds", 600) * 1000,
	callCap: numberOption(options, "maxHeavyToolCalls", 20),
	heavyTokens: numberOption(options, "heavyContextTokens", 400_000),
	failLimit: numberOption(options, "maxIdenticalFailures", 3),
});

interface Changed<T, R> {
	readonly next: T;
	readonly out: R;
}

const within = (
	times: readonly number[] | undefined,
	now: number,
	windowMs: number,
): readonly number[] => (times ?? []).filter((time) => now - time < windowMs);

/** Times held in a ledger, with the new one added unless the cap holds. */
const admit = (
	held: readonly number[] | undefined,
	now: number,
	cap: number,
	windowMs: number,
	deny: (count: number) => string,
): Changed<readonly number[], string | undefined> => {
	const times = within(held, now, windowMs);
	return times.length >= cap
		? { next: times, out: deny(times.length) }
		: { next: [...times, now], out: undefined };
};

export const runningCount = (agents: readonly AgentInfo[]): number =>
	agents.filter(
		(agent) => agent.status === "pending" || agent.status === "running",
	).length;

export const crowded = (
	running: number,
	cap: number | undefined,
): string | undefined =>
	cap !== undefined && running >= cap
		? DENY_SUBAGENTS({ running, cap })
		: undefined;

export const admitStart = (
	held: readonly number[] | undefined,
	now: number,
	limits: Limits,
): Changed<readonly number[], string | undefined> =>
	admit(held, now, limits.startCap, limits.windowMs, (starts) =>
		DENY_STARTS({
			starts,
			cap: limits.startCap,
			seconds: limits.windowMs / 1000,
		}),
	);

/** Calls count only while the context is heavy, so a light context keeps no ledger. */
export const admitCall = (
	held: readonly number[] | undefined,
	now: number,
	tokens: number | undefined,
	limits: Limits,
): Changed<readonly number[], string | undefined> =>
	tokens === undefined || tokens < limits.heavyTokens
		? { next: [], out: undefined }
		: admit(held, now, limits.callCap, limits.windowMs, (calls) =>
				DENY_CALLS({
					calls,
					cap: limits.callCap,
					seconds: limits.windowMs / 1000,
				}),
			);

interface Failure {
	readonly count: number;
	readonly error: string;
	readonly last: number;
}

export type Failures = Readonly<Record<string, Failure>>;

export const signature = (tool: string, input: unknown): string =>
	`${tool}\n${JSON.stringify(input)}`;

export const withFailure = (
	held: Failures | undefined,
	call: { tool: string; input: unknown; error: string },
	now: number,
	windowMs: number,
): Failures => {
	const live = Object.entries(held ?? {}).filter(
		([, failure]) => now - failure.last < windowMs,
	);
	const key = signature(call.tool, call.input);
	const prior = live.find(([name]) => name === key)?.[1];
	const count = prior?.error === call.error ? prior.count + 1 : 1;
	return {
		...Object.fromEntries(live),
		[key]: { count, error: call.error, last: now },
	};
};

export const failedText = (
	held: Failures | undefined,
	call: { tool: string; input: unknown },
	now: number,
	limits: Limits,
): string | undefined => {
	const seen = held?.[signature(call.tool, call.input)];
	return seen !== undefined &&
		seen.count >= limits.failLimit &&
		now - seen.last < limits.windowMs
		? DENY_FAILED({
				count: seen.count,
				error: seen.error,
				limit: limits.failLimit,
			})
		: undefined;
};
