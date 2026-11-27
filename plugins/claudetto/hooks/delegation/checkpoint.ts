import type { EngineInterface, On } from "claude-code";

import { fault } from "../shared/fault";

/** Minutes of a subagent's run between two checkpoints (DELEGATION-071). */
export const CHECKPOINT_MINUTES = 10;

const CHECKPOINT_MS = CHECKPOINT_MINUTES * 60_000;

/** Matches every tool name; this plugin's unmatched `tool.call` hook lives in `guards/memory.ts`. */
const ANY = /(?:)/u;

/** What a subagent reads beside a tool result once each checkpoint passes. */
export const checkpointNote = (minutes: number): string =>
	`You have worked ${minutes} minutes on this task. Re-read your task prompt and keep to the slice it names. ` +
	"When that slice is done, stop and end your turn with the report, so the lead gets it while its cache is warm.";

/** The checkpoints `agentId` has passed: whole intervals since its start, or 0 when unlisted. */
async function passed($: EngineInterface, agentId: string): Promise<number> {
	const agents = await $.agent.list();
	const agent = agents.find((item) => item.id === agentId);
	if (agent === undefined) {
		return 0;
	}
	return Math.floor(((await $.clock.now()) - agent.startTime) / CHECKPOINT_MS);
}

/**
 * Adds a checkpoint note to a subagent's tool result each time its run passes
 * another `CHECKPOINT_MINUTES` (DELEGATION-071). The call itself runs as made:
 * the note steers a worker back to its slice and to an early report, and a
 * worker that keeps making progress is never stopped (ADR-0041).
 */
export function registerCheckpoint(on: On): void {
	const noted = new Map<string, number>();
	on("tool.call", { tool: ANY }, async ($, e, next) => {
		const r = await next(e);
		if (e.agentId === undefined || r.deny !== undefined) {
			return r;
		}
		const count = await passed($, e.agentId);
		if (count <= (noted.get(e.agentId) ?? 0)) {
			return r;
		}
		noted.set(e.agentId, count);
		return {
			...r,
			context: [
				...(r.context ?? []),
				checkpointNote(count * CHECKPOINT_MINUTES)
			]
		};
	}).catch(($, e, next) => {
		fault($, "subagent checkpoint", next.error);
		return next(e);
	});
}
