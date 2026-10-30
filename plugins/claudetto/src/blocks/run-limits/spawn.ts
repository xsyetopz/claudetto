import type { AgentInfo } from "claude-code";
import type { Changed } from "./ledger.ts";
import { DENY_STARTS, DENY_SUBAGENTS } from "./prompts.ts";
import type { Limits } from "./settings.ts";

const RUNNING = ["pending", "running"];

export const runningCount = (agents: readonly AgentInfo[]): number =>
	agents.filter((agent) => RUNNING.includes(agent.status)).length;

export const within = (
	times: readonly number[] | undefined,
	now: number,
	windowMs: number,
): readonly number[] => (times ?? []).filter((time) => now - time < windowMs);

export const crowded = (running: number, limits: Limits): string | undefined =>
	limits.subagentCap !== undefined && running >= limits.subagentCap
		? DENY_SUBAGENTS({ running, cap: limits.subagentCap })
		: undefined;

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
