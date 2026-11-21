import type { AgentInfo, EngineInterface } from "claude-code";

/** The statuses of an agent that still holds a concurrency slot. */
const LIVE: ReadonlySet<AgentInfo["status"]> = new Set([
	"pending",
	"running",
	"waiting"
]);

/** The refusal the model reads, within 200 characters. */
export const waitMessage = (live: number, limit: number): string =>
	`${live} subagents are live and the limit is ${limit}. Wait for one to finish; its result arrives by itself. Spawn again then. Retrying now fails.`;

/**
 * Names the refusal for a spawn that would pass
 * `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS`, or undefined when a slot is free.
 * The engine's own answer ("Concurrent subagent limit reached. Do not retry")
 * reads as a dead end, so the model retries or gives the work up; this one
 * says to wait. A limit of 0 or less is no bound.
 */
export async function concurrencyDeny(
	$: EngineInterface
): Promise<string | undefined> {
	const { concurrent } = await $.agent.limits();
	if (concurrent <= 0) {
		return undefined;
	}
	const agents = await $.agent.list();
	const live = agents.filter((agent) => LIVE.has(agent.status)).length;
	return live >= concurrent ? waitMessage(live, concurrent) : undefined;
}
