// The turn count of the subagents in the `prompt` slice: the count in `$.state`, and the turn line at the bound of the type of a subagent.

import { type Calls, nextCalls, withoutCalls } from "../domain/turns.ts";
import { STATE_TRIES_MAX } from "../limits.ts";
import { TURN_LIMIT_LINE } from "../prompts.ts";

/** The calls that the helpers make. The mod gives each call, because the mod runtime follows `$` into no imported arrow function. */
export interface CallsPort {
	readonly getCalls: () => Promise<{
		value: Readonly<Calls> | undefined;
		version: number;
	}>;
	readonly setCalls: (calls: Calls, ifVersion: number) => Promise<boolean>;
}

/** The outcome of `updateCalls`. */
type Updated<R> =
	| { kind: "written"; result: R }
	| { kind: "idle" }
	| { kind: "lost" };

/** Reads the counts, makes `step` of them, and writes the result with the version, up to `STATE_TRIES_MAX` tries: a try fails when another write landed first, so that parallel calls and a stop lose no count and no fired flag. A step that gives `undefined` writes nothing. Gives `written` with the `result` of the step that was written, `idle` when the step wrote nothing, or `lost` when every try lost the race or the state threw, so that the caller tells "no write needed" from a count that is gone. */
const updateCalls = async <R>(
	io: CallsPort,
	step: (
		calls: Readonly<Calls> | undefined,
	) => { calls: Calls; result: R } | undefined,
): Promise<Updated<R>> => {
	const attempt = async (tries: number): Promise<Updated<R>> => {
		if (tries >= STATE_TRIES_MAX) {
			return { kind: "lost" };
		}
		const { value, version } = await io.getCalls();
		const next = step(value);
		if (next === undefined) {
			return { kind: "idle" };
		}
		const isSet = await io.setCalls(next.calls, version);
		return isSet
			? { kind: "written", result: next.result }
			: attempt(tries + 1);
	};
	try {
		return await attempt(0);
	} catch {
		// A fault of the state is a count that is gone, as a lost race is.
		return { kind: "lost" };
	}
};

/** The agents that got `TURN_LIMIT_LINE` while the state was broken: a broken state loses each count, so the line goes out once for each agent and not with each call. The flag stays when the state recovers, so that the agent gets no second line at its real bound. Only the stop of the agent clears it. */
const toldWhileLost = new Set<string>();

/** Counts one call of the subagent, and tells whether its line goes out with this call. An agent that got the line while the state was broken gets none at its bound. A count that every try lost is unknown, so the line goes out one time: one extra line costs less than a missed one, and a line with each call costs more. */
const countCall = async (
	io: CallsPort,
	id: string,
	type: string | undefined,
): Promise<boolean> => {
	const done = await updateCalls(io, (value) => {
		const { calls, atBound } = nextCalls(value, id, type);
		return { calls, result: atBound };
	});
	if (done.kind === "lost") {
		if (toldWhileLost.has(id)) {
			return false;
		}
		toldWhileLost.add(id);
		return true;
	}
	return done.kind === "written" && done.result && !toldWhileLost.has(id);
};

/** `answer` with `TURN_LIMIT_LINE` when this call of the subagent is its first at or over the bound. The main thread has no `agent_id`, so it gets none. A fault of the state gives the line one time for the agent, through `countCall`, and a fault of `countCall` itself leaves it out. */
export const withLimit = async <A extends { additionalContext?: string[] }>(
	io: CallsPort,
	e: { agent_id?: string | undefined; agent_type?: string | undefined },
	answer: A,
): Promise<A> => {
	if (!e.agent_id) {
		return answer;
	}
	try {
		return (await countCall(io, e.agent_id, e.agent_type))
			? {
					...answer,
					additionalContext: [
						...(answer.additionalContext ?? []),
						TURN_LIMIT_LINE,
					],
				}
			: answer;
	} catch {
		return answer;
	}
};

/** Clears the count of the subagent `id` that ended. A fault of the state leaves the count to the end of the session. */
export const clearCount = async (io: CallsPort, id: string): Promise<void> => {
	toldWhileLost.delete(id);
	try {
		await updateCalls(io, (value) =>
			value?.[id] === undefined
				? undefined
				: { calls: withoutCalls(value, id), result: true },
		);
	} catch {
		// A fault of the state leaves the count to the end of the session.
	}
};
