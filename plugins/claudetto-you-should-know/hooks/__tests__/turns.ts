/** Fixtures that drive the turn events of the mounted-flow tests. */

import type { Engine } from "claude-code/testing";

/** Reads a stream to its end so the step behind it completes. */
export const drain = async (stream: AsyncIterator<unknown>): Promise<void> => {
	const chunk = await stream.next();
	if (chunk.done !== true) {
		await drain(stream);
	}
};

/** Runs one step of turn `turnId` to its end, as the agent `agentId` when one is given. */
export const stepTurn = (
	$: Engine,
	turnId: string,
	index: number,
	agentId?: string
): Promise<void> => {
	const stream = $.turn.step({
		turnId,
		index,
		model: "m",
		messageCount: 1,
		...(agentId === undefined ? {} : { agentId })
	});
	return drain(stream[Symbol.asyncIterator]());
};

/** Ends turn `turnId`, as the agent `agentId` when one is given. */
export const completeTurn = (
	$: Engine,
	turnId: string,
	agentId?: string
): Promise<unknown> =>
	$.turn.complete({
		turnId,
		answer: "",
		durationMs: 1,
		isAborted: false,
		reason: "answer",
		...(agentId === undefined ? {} : { agentId })
	});
