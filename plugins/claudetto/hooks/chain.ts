import type { HookFor } from "claude-code";

type Call = HookFor<"tool.call">;
export type CallEvent = Parameters<Call>[1];
export type CallNext = Parameters<Call>[2];
export type CallAnswer = ReturnType<Call>;

type Check = HookFor<"tool.check">;
export type CheckEvent = Parameters<Check>[1];
export type CheckNext = Parameters<Check>[2];
export type CheckAnswer = ReturnType<Check>;

type Step<E, N, R> = (e: E, next: N) => R;

/**
 * Runs `steps` in order as one hook: each step's `next` runs the steps after it, and the last one's runs what is beneath the plugin.
 * `$` never comes here, because the loader follows it only into a guard a step calls by name. The `next` of a step is a `Proxy`, so its `budget` and `signal` stay the engine's.
 */
export const chain = <E, N extends (e: E) => R, R>(
	e: E,
	next: N,
	steps: readonly Step<E, N, R>[],
): R => {
	const from = (i: number, at: E): R => {
		const step = steps[i];
		return step === undefined
			? next(at)
			: step(
					at,
					new Proxy(next, {
						apply: (_target, _self, args: [E]) => from(i + 1, args[0]),
					}),
				);
	};
	return from(0, e);
};
