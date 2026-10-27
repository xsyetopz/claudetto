// The count of the tool calls of each subagent, for the soft turn limit (task 19.10).

import { TURN_BOUND_DEFAULT, TURN_BOUNDS } from "../limits.ts";

/** The tool calls so far, by `agent_id`. A negative count is the fired flag: the line went out, and the count is its size, so that the state keeps its shape in the contract `plugins/claudetto/types/index.d.ts`. */
export interface Calls {
	[agentId: string]: number;
}

/** The bound of an agent type, or `TURN_BOUND_DEFAULT` for a type with no bound. */
export const turnBound = (type: string | undefined): number =>
	(type === undefined ? undefined : TURN_BOUNDS[type]) ?? TURN_BOUND_DEFAULT;

/** The counts after one more call of `id`, and whether the line goes out with this call: the first call at or over the bound, one time, also when parallel calls skipped the bound. */
export const nextCalls = (
	calls: Readonly<Calls> | undefined,
	id: string,
	type: string | undefined,
): { calls: Calls; atBound: boolean } => {
	const before = calls?.[id] ?? 0;
	const count = Math.abs(before) + 1;
	const atBound = before >= 0 && count >= turnBound(type);
	return {
		calls: { ...calls, [id]: before < 0 || atBound ? -count : count },
		atBound,
	};
};

/** The counts without `id`. */
export const withoutCalls = (
	calls: Readonly<Calls> | undefined,
	id: string,
): Calls =>
	Object.fromEntries(Object.entries(calls ?? {}).filter(([k]) => k !== id));
