import type { On } from "claude-code";

import { fault } from "../shared/fault";

/** The longest description a kept built-in tool carries (REQ-TOOLS-003). */
export const MAX_DESCRIPTION = 200;

/**
 * What the model reads about each kept built-in tool. The input schema already
 * names the parameters, so each text keeps what the schema cannot say: when to
 * call the tool, the limits, and the one mistake the stock text warns about.
 * Glob and Grep are absent in Claude Code 2.1.330, so they have no entry.
 */
export const TOOL_DESCRIPTIONS: Readonly<Record<string, string>> = {
	Bash: "Run a shell command. cd persists only inside the working directories, so use absolute paths. timeout is in ms (default 120000, max 600000). run_in_background detaches it; foreground sleep is blocked.",
	Read: "Read a file by absolute file_path: 2000 lines by default, offset and limit for part, cat -n format. Also reads images, PDFs (pages, max 20 per request) and .ipynb notebooks.",
	Agent:
		"Launch a subagent for independent or broad multi-file work. It knows only your prompt and returns a summary. Set subagent_type (default general-purpose). Runs in the background by default.",
	Skill:
		"Invoke a listed skill by exact name (plugin:skill for plugin skills) with optional args, when a listed skill covers the task. Built-in CLI commands such as /help are not skills.",
	ToolSearch:
		"Fetch the schemas of deferred tools so they can be called. query: select:A,B for exact names, or keywords; +term requires it in the name. Fetched tools are callable at once.",
	AskUserQuestion:
		"Ask only when blocked on a decision that is the user's. Put a recommended option first, ending its label with (Recommended). multiSelect allows several answers. Never ask 'is the plan ready'.",
	Monitor:
		"Stream events from a long-running script or ws source, one notification per stdout line. For a single notification use Bash run_in_background. Filter to lines you act on, failures included.",
	TaskStop:
		"Stop a running background task, agent or teammate by task_id (its ID or name). Returns success or failure.",
	TodoWrite:
		"Replace the session todo list; send the full list each call. Each item has content, status (pending, in_progress, completed) and activeForm. Keep one item in_progress.",
	TaskCreate:
		"Create a pending task with subject, description and optional activeForm. Use it for work of three or more steps. Check TaskList first for duplicates; set dependencies with TaskUpdate.",
	TaskGet:
		"Get one task by ID: subject, description, status, blocks and blockedBy. Read it before starting or updating the task, and start only when blockedBy is empty.",
	TaskList:
		"List all tasks with id, subject, status, owner and blockedBy. Use it to find pending, unowned, unblocked work; take the lowest ID first. TaskGet returns the full task.",
	TaskUpdate:
		"Update a task: status (pending, in_progress, completed, deleted), subject, description, owner, addBlocks, addBlockedBy. Mark completed only when fully done. TaskGet first.",
	ExitPlanMode:
		"In plan mode, request approval once the plan file is complete; it reads the plan from that file. Only for plans that implement code. Resolve open questions with AskUserQuestion first."
};

/**
 * Replaces the stock description of each tool in {@link TOOL_DESCRIPTIONS}. It
 * ends the chain without calling `next`, so a hook registered earlier, such as
 * the git block's, runs over the short text.
 *
 * @param on The engine's hook registrar.
 */
export function registerToolDescribe(on: On): void {
	on(
		"tool.describe",
		{
			tool: new RegExp(`^(?:${Object.keys(TOOL_DESCRIPTIONS).join("|")})$`, "u")
		},
		(_$, e) => ({ description: TOOL_DESCRIPTIONS[e.tool] ?? e.description })
	).catch(($, e, next) => {
		fault($, "tool describe", next.error);
		return next(e);
	});
}
