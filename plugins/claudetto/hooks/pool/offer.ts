import type { On } from "claude-code";

import { fault } from "../shared/fault";

/**
 * The tools every loop loses. `patch` and `mcp__claudetto__read` replace the
 * file tools (Read costs 1,292 characters of schema; the claudetto tool is
 * about a third of that and covers images, notebooks and PDFs), and Bash runs
 * `git worktree` in place of the worktree tools (TOOLS-001). The user
 * turned off DesignSync and RemoteTrigger, which serve claude.ai design
 * projects and cloud routines (TOOLS-004), and Workflow, ScheduleWakeup
 * and ReportFindings, whose schemas (5,688, 4,886 and 2,418 characters) ride
 * every request for features the user does not use.
 */
export const HIDDEN_TOOLS: readonly string[] = [
	"Write",
	"Edit",
	"NotebookEdit",
	"EnterWorktree",
	"ExitWorktree",
	"DesignSync",
	"RemoteTrigger",
	"Workflow",
	"ScheduleWakeup",
	"ReportFindings",
	"Read"
];

/**
 * The cross-session messaging tools, offered to the main conversation only:
 * the user asks for another session there, while a subagent's send goes out
 * under its parent's address and its reply reaches the parent, so a subagent
 * gains nothing but the tool bytes (TOOLS-001, TOOLS-002). `notify` reaches the
 * user, which is the lead's job (KERNEL-035).
 */
export const MAIN_ONLY_TOOLS: readonly string[] = [
	"SendMessage",
	"ListAgents",
	"mcp__claudetto__notify"
];

/**
 * The tools a subagent loses: Monitor, TaskStop and the goal tools. A goal
 * belongs to the main session, so a worker that sets or clears it acts on the
 * lead's state (TOOLS-005). The main loop keeps all of them.
 */
export const SUBAGENT_HIDDEN_TOOLS: readonly string[] = [
	"Monitor",
	"TaskStop",
	"mcp__claudetto__set_goal",
	"mcp__claudetto__get_goal",
	"mcp__claudetto__pause_goal",
	"mcp__claudetto__clear_goal"
];

const pattern = (tools: readonly string[]): RegExp =>
	new RegExp(`^(?:${tools.join("|")})$`, "u");

/**
 * Hides {@link HIDDEN_TOOLS} from every loop, and {@link MAIN_ONLY_TOOLS} and
 * {@link SUBAGENT_HIDDEN_TOOLS} from each subagent's loop, because `tool.offer` fires per loop.
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
	on("tool.offer", { tool: pattern(SUBAGENT_HIDDEN_TOOLS) }, (_$, e, next) =>
		e.agentId === undefined ? next(e) : { isOffered: false }
	).catch(($, e, next) => {
		fault($, "tool offer", next.error);
		return next(e);
	});
}
