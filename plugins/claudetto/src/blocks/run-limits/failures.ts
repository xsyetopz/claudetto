import { signature } from "../gate/denials.ts";
import { DENY_FAILED } from "./prompts.ts";
import type { Limits } from "./settings.ts";

export interface Failure {
	readonly count: number;
	readonly error: string;
	readonly last: number;
}

export type Failures = Readonly<Record<string, Failure>>;

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
