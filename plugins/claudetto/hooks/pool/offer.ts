import type { On } from "claude-code";

import { fault } from "../shared/fault";

/**
 * The tools every loop loses. `patch` and Bash replace the file tools, and Bash
 * runs `git worktree` in place of the worktree tools (REQ-TOOLS-001). The user
 * turned off DesignSync and RemoteTrigger, which serve claude.ai design
 * projects and cloud routines (REQ-TOOLS-004).
 */
export const HIDDEN_TOOLS: readonly string[] = [
	"Write",
	"Edit",
	"NotebookEdit",
	"EnterWorktree",
	"ExitWorktree",
	"DesignSync",
	"RemoteTrigger"
];

/**
 * The cross-session messaging tools, offered to the main conversation only:
 * the user asks for another session there, while a subagent's send goes out
 * under its parent's address and its reply reaches the parent, so a subagent
 * gains nothing but the tool bytes (REQ-TOOLS-001, REQ-TOOLS-002).
 */
export const MAIN_ONLY_TOOLS: readonly string[] = ["SendMessage", "ListAgents"];

const pattern = (tools: readonly string[]): RegExp =>
	new RegExp(`^(?:${tools.join("|")})$`, "u");

/**
 * Hides {@link HIDDEN_TOOLS} from every loop and {@link MAIN_ONLY_TOOLS} from
 * each subagent's loop, because `tool.offer` fires per loop.
 *
 * @param on The engine's hook registrar.
 */
export function registerToolOffer(on: On): void {
	on("tool.offer", { tool: pattern(HIDDEN_TOOLS) }, () => ({
		isOffered: false
	})).catch(($, e, next) => {
		fault($, "tool offer", next.error);
		return next(e);
	});
	on("tool.offer", { tool: pattern(MAIN_ONLY_TOOLS) }, (_$, e, next) =>
		e.agentId === undefined ? next(e) : { isOffered: false }
	).catch(($, e, next) => {
		fault($, "tool offer", next.error);
		return next(e);
	});
}
