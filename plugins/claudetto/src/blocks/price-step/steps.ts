import type { TurnUsage } from "claude-code";

/** One model request's reading, which its stop chunk settles, and the tokens of its results that went through. */
export interface Step {
	readonly reading: Promise<TurnUsage | null>;
	readonly settle: (usage: TurnUsage | null) => void;
	passed: number;
}

export const newStep = (): Step => {
	const { promise, resolve } = Promise.withResolvers<TurnUsage | null>();
	return { reading: promise, settle: resolve, passed: 0 };
};

// Keyed by `tool_use_id`, which names one call in one step on any loop, so a subagent's calls need no `agentId` key.
const byCall = new Map<string, Step>();

export const waitFor = (id: string, step: Step): void => {
	byCall.set(id, step);
};

/** The step that made the call, removed so the map holds only calls still running. */
export const takeStep = (id: string | undefined): Step | undefined => {
	if (id === undefined) {
		return undefined;
	}
	const step = byCall.get(id);
	byCall.delete(id);
	return step;
};
