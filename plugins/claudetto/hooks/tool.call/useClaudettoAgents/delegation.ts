import type { On } from "claude-code";

import { deferral } from "../../settings.read/useSlimSurface/surface";
import { AGENT_TEXT, ASK_TEXT } from "../../texts";

const agentHooks = (on: On): void => {
	on("agent.offer", (_$, e, next) =>
		e.source === "built-in" ? { isOffered: false } : next(e),
	);

	on("tool.describe", { tool: "Agent" }, async (_$, e, next) => ({
		...(await next(e)),
		description: AGENT_TEXT,
	}));
};

const searchHooks = (on: On): void => {
	// Auto mode reads a popup answer only from this tool, so the model calls it and only its description is cut.
	on("tool.describe", { tool: "AskUserQuestion" }, async ($, e, next) => ({
		...(await next(e)),
		description: ASK_TEXT,
		...deferral(await $.tool.list()),
	}));
};

export const delegation = (on: On): void => {
	agentHooks(on);
	searchHooks(on);
};
