// The decisions about a subagent start. Pure: the hook reads the facts and this file only judges
// them, so a test calls it with plain values.

import type { AgentInfo } from "claude-code";
import type { Changed } from "./ledger.ts";
import { DENY_STARTS, DENY_SUBAGENTS } from "./prompts.ts";
import type { Limits } from "./settings.ts";

/** An agent that has not ended: `pending` and `running`, as `AgentStatus` names them. `waiting` and `idle` hold no work that runs. */
const RUNNING = ["pending", "running"];

/** How many of `agents` run now. */
export const runningCount = (agents: readonly AgentInfo[]): number =>
	agents.filter((agent) => RUNNING.includes(agent.status)).length;

/** The times inside the period that ends at `now`. */
export const within = (
	times: readonly number[] | undefined,
	now: number,
	windowMs: number,
): readonly number[] => (times ?? []).filter((time) => now - time < windowMs);

/** The reason to refuse a start while `running` agents run and the cap is reached, or `undefined`. */
export const crowded = (running: number, limits: Limits): string | undefined =>
	limits.subagentCap !== undefined && running >= limits.subagentCap
		? DENY_SUBAGENTS({ running, cap: limits.subagentCap })
		: undefined;

/**
 * Counts a start into the period, or refuses it when the period already holds `startCap`. A refused
 * start is not counted, so the period empties as the starts age out.
 */
export const admitStart = (
	held: readonly number[] | undefined,
	now: number,
	limits: Limits,
): Changed<readonly number[], string | undefined> => {
	const starts = within(held, now, limits.windowMs);
	return starts.length >= limits.startCap
		? {
				next: starts,
				out: DENY_STARTS({
					starts: starts.length,
					cap: limits.startCap,
					seconds: limits.windowMs / 1000,
				}),
			}
		: { next: [...starts, now], out: undefined };
};
