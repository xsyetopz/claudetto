// Keyed by `tool_use_id`, which names one call in one step on any loop, so a subagent's calls need no `agentId` key.
const allowed = new Set<string>();

/** Notes a call the classifier allowed, so the gate can let that allow settle its own `ask`. */
export const markJudged = (id: string | undefined): void => {
	if (id !== undefined) {
		allowed.add(id);
	}
};

/** Whether the classifier allowed the call, removed on read so that a call that throws leaves no entry. */
export const takeJudged = (id: string | undefined): boolean =>
	id !== undefined && allowed.delete(id);
