// The failures of a call, kept for each call. Pure: no `$` is read here. The refusal of an identical
// retry is answered at `tool.check` beside the refusal of a denied call, because that event takes
// one handler.

import { signature } from "../gate/denials.ts";
import { DENY_FAILED } from "./prompts.ts";
import type { Limits } from "./settings.ts";

/** The failures of one call: how many in a row with the same error, the newest error, and when. */
export interface Failure {
	readonly count: number;
	readonly error: string;
	readonly last: number;
}

/** The failures by the key of the call, which `signature` builds. */
export type Failures = Readonly<Record<string, Failure>>;

/**
 * The failures with one more for the call, and without any that are past the period, so the record
 * holds only what can still refuse a call. An error unlike the last one starts the count at one: the
 * call fails for another reason now, and the earlier error would be the wrong reason to give.
 */
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

/** The text that refuses an identical retry, or `undefined` while the call is under the limit or the last failure is past the period. */
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
