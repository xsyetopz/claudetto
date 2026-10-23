// The bounds of the `prompt` slice.

/** The most characters of one fact value (a branch, a tag, a change name, a task id), so that a long name cannot grow the context block. */
export const FACT_VALUE_MAX_CHARS = 60;

/** A tool that fewer than this percent of the counted sessions use goes behind `ToolSearch` (D20, task 10.10). */
export const DEFER_BELOW_PERCENT = 10;

/** The sessions of `research/sessions.md` that the use counts below come from. */
export const COUNTED_SESSIONS = 292;

/**
 * How many of the `COUNTED_SESSIONS` call each tool that is on and offered in a coding session (table and method in `research/tool-use.md`).
 * `DEFERRED_TOOLS` of `domain/tools.ts` keeps each tool under `DEFER_BELOW_PERCENT` that the roster and the engine do not need each session.
 */
export const TOOL_SESSION_USE: Readonly<Record<string, number>> =
  Object.fromEntries(
    "Agent:196 AskUserQuestion:96 Bash:262 Edit:67 EnterWorktree:0 ExitWorktree:0 Glob:2 Grep:11 LSP:0 ListAgents:3 ListMcpResourcesTool:0 Monitor:26 Read:124 ReadMcpResourceDirTool:0 ReadMcpResourceTool:0 SendMessage:112 Skill:23 StructuredOutput:0 SubagentHandback:195 TodoWrite:0 ToolSearch:84 WebFetch:14 WebSearch:4 Workflow:0 Write:126"
      .split(" ")
      .map((use) => use.split(":") as [string, string])
      .map(([tool, n]) => [tool, Number(n)]),
  );

/** The tools that stay on the base prompt below the bound: the tools of the roster agents (`agents/*.md`) and `Agent` and `SendMessage` of `main.md`, `ToolSearch` (it cannot be deferred), and the two that end a run (`SubagentHandback`, `StructuredOutput`). */
export const NEVER_DEFERRED: readonly string[] =
  "Agent Bash Edit Glob Grep Monitor Read SendMessage StructuredOutput SubagentHandback ToolSearch WebFetch WebSearch Write".split(
    " ",
  );

/** The longest time of one `git` run that gathers a fact, in milliseconds. */
export const FACT_RUN_TIMEOUT_MS = 5_000;

/** The most folders of `openspec/changes` that the search for the open change reads. */
export const FACT_CHANGES_MAX = 20;
