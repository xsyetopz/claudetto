import type { EngineInterface, On } from "claude-code";

import { fault } from "../shared/fault";

/**
 * The minutes of wall time after which a subagent is told to wrap up. Its prompt cache
 * lives 5 minutes, or 1 hour at most, so a longer run re-reads its whole context uncached.
 */
export const RUNAWAY_MINUTES = 30;

const MS_PER_MINUTE = 60_000;

/** Each subagent's first turn.start, in epoch milliseconds, for a run `$.agent.list()` does not list. */
const firstTurn = new Map<string, number>();

/** Each subagent's start as `$.agent.list()` gave it, kept so the list is read once per agent. */
const listed = new Map<string, number>();

/** The subagents already told. */
const told = new Set<string>();

/** The note a long-running subagent reads, within 200 characters. */
export const runawayNote = (minutes: number): string =>
	`You have run ${minutes} min. Finish the current slice and report now, listing what remains so a new agent can take it.`;

/** Records when a subagent's first turn began, the start time when the agent list has none. */
export function registerRunaway(on: On): void {
	on("turn.start", async ($, e, next) => {
		if (e.agentId !== undefined && !firstTurn.has(e.agentId)) {
			firstTurn.set(e.agentId, await $.clock.now());
		}
		return next(e);
	}).catch(($, e, next) => {
		fault($, "runaway start", next.error);
		return next(e);
	});
}

/**
 * The wrap-up note a subagent owes its next tool result once it has run past
 * RUNAWAY_MINUTES, or undefined. It marks the agent told, so the note comes once.
 * The start is the agent's `startTime` from `$.agent.list()`, else its first turn.start.
 */
export async function runawayDue(
	$: EngineInterface,
	agentId: string
): Promise<string | undefined> {
	if (told.has(agentId)) {
		return undefined;
	}
	let start = listed.get(agentId);
	if (start === undefined) {
		// A failed list falls back to the first turn.start rather than costing the other notes.
		const agents = await $.agent.list().catch(() => []);
		start = agents.find((agent) => agent.id === agentId)?.startTime;
		if (start !== undefined) {
			listed.set(agentId, start);
		}
	}
	start ??= firstTurn.get(agentId);
	if (start === undefined) {
		return undefined;
	}
	const minutes = Math.floor(((await $.clock.now()) - start) / MS_PER_MINUTE);
	if (minutes < RUNAWAY_MINUTES) {
		return undefined;
	}
	told.add(agentId);
	return runawayNote(minutes);
}
