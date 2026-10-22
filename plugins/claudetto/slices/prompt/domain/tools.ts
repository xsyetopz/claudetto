// The tool texts of the `prompt` slice (task 6.3 of change `0-3-0`): an ASD-STE100 text for each kept built-in tool,
// with each rule of the default text that the model needs, and the tools that a session seldom uses, which load behind `ToolSearch`.

import {
  TOOL_AGENT,
  TOOL_BASH,
  TOOL_EDIT,
  TOOL_READ,
  TOOL_SKILL,
  TOOL_TOOL_SEARCH,
  TOOL_WRITE,
} from "../prompts.ts";

export const TOOL_TEXTS: Readonly<Record<string, string>> = {
  Agent: TOOL_AGENT,
  Bash: TOOL_BASH,
  Edit: TOOL_EDIT,
  Read: TOOL_READ,
  Skill: TOOL_SKILL,
  ToolSearch: TOOL_TOOL_SEARCH,
  Write: TOOL_WRITE,
};

/** The tools that load behind `ToolSearch`. `ToolSearch` itself cannot be deferred (batch 6 of `research/probes.md`). */
export const DEFERRED_TOOLS: readonly string[] = ["ListAgents", "Workflow"];
