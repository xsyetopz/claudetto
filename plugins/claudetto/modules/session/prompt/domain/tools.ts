// The ASD-STE100 text of each kept built-in tool (task 6.3 of change `0-3-0`), and the tools that load behind `ToolSearch`.

import {
	COUNTED_SESSIONS,
	DEFER_BELOW_PERCENT,
	NEVER_DEFERRED,
	TOOL_SESSION_USE,
} from "../limits.ts";
import {
	TOOL_AGENT,
	TOOL_BASH,
	TOOL_EDIT,
	TOOL_ENTER_WORKTREE,
	TOOL_EXIT_WORKTREE,
	TOOL_READ,
	TOOL_SEND_MESSAGE,
	TOOL_SKILL,
	TOOL_TOOL_SEARCH,
	TOOL_WRITE,
} from "../prompts.ts";

export const TOOL_TEXTS: Readonly<Record<string, string>> = {
	Agent: TOOL_AGENT,
	Bash: TOOL_BASH,
	Edit: TOOL_EDIT,
	EnterWorktree: TOOL_ENTER_WORKTREE,
	ExitWorktree: TOOL_EXIT_WORKTREE,
	Read: TOOL_READ,
	SendMessage: TOOL_SEND_MESSAGE,
	Skill: TOOL_SKILL,
	ToolSearch: TOOL_TOOL_SEARCH,
	Write: TOOL_WRITE,
};

/** The tools that load behind `ToolSearch`: each tool that fewer than `DEFER_BELOW_PERCENT` of the counted sessions use, and that is not in `NEVER_DEFERRED`. `ToolSearch` itself cannot be deferred (batch 6 of `research/probes.md`). */
export const DEFERRED_TOOLS: readonly string[] = Object.entries(
	TOOL_SESSION_USE,
)
	.filter(
		([tool, sessions]) =>
			!NEVER_DEFERRED.includes(tool) &&
			sessions * 100 < DEFER_BELOW_PERCENT * COUNTED_SESSIONS,
	)
	.map(([tool]) => tool);
