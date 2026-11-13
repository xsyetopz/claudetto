import type { On } from "claude-code";

// A `model` the lead passes outranks the agent file's, so each subagent runs on the model its file names. The matcher keeps this mod clear of the one unmatched `agent.spawn` hook a module may hold.
export const agentFileModel = (on: On): void => {
	on("agent.spawn", { subagentType: /./u }, (_$, e, next) => {
		const { model: _passed, ...rest } = e;
		return next(rest);
	});
};
