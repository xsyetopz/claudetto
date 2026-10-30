import type { On } from "claude-code";
import type { Block, BlockContext } from "../block.ts";
import {
	GOAL_MATCH,
	onFinishStop,
	onGoalCommand,
	onGoalDescribe,
	onGoalHint,
	onGoalTool,
} from "./hooks.ts";

export const finish: Block = {
	id: "finish",
	kind: "policy",
	routes: [
		"classic.Stop",
		"command.run",
		"command.describe",
		"ui.render",
		"session.messages",
		"process.run",
		"tool.register",
		"tool.call",
	],
	needs: "2.1.314",
};

export const attachFinish = (on: On, _context: BlockContext): void => {
	// `run-limits` holds the bare `classic.Stop` registration, and a repeat throws, so this one matches every stop by its name.
	on("classic.Stop", { hook_event_name: "Stop" }, onFinishStop);
	on("command.run", { command: "goal" }, onGoalCommand);
	on("command.describe", { command: "goal" }, onGoalDescribe);
	on("ui.render", { component: "PromptHint" }, onGoalHint);
	on("tool.call", GOAL_MATCH, onGoalTool);
};
