import type { Changed } from "./ledger.ts";
import { DENY_CALLS } from "./prompts.ts";
import type { Limits } from "./settings.ts";
import { within } from "./spawn.ts";

export const admitCall = (
	held: readonly number[] | undefined,
	now: number,
	tokens: number | undefined,
	limits: Limits,
): Changed<readonly number[], string | undefined> => {
	if (tokens === undefined || tokens < limits.heavyTokens) {
		return { next: [], out: undefined };
	}
	const calls = within(held, now, limits.windowMs);
	return calls.length >= limits.callCap
		? {
				next: calls,
				out: DENY_CALLS({
					calls: calls.length,
					cap: limits.callCap,
					seconds: limits.windowMs / 1000,
				}),
			}
		: { next: [...calls, now], out: undefined };
};
