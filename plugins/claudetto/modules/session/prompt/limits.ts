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

/** The most characters of a prompt before a size line goes out: 40,000 characters are about 10,000 tokens at `CHARS_PER_TOKEN`, and a large paste is sent again with each later request. */
export const PROMPT_SIZE_MAX_CHARS = 40_000;

/**
 * The characters of a `Bash` result that Claude Code keeps, in place of its default of 30,000: it keeps the first characters and drops the rest (function `fRn` of 2.1.310), so the bound must hold the whole failure output of a step.
 * The failed `lab` step of `just check` with 2 broken tests wrote 21,742 characters, the largest of the steps measured on 2026-10-26 (task 19.9), with the failure lines after the passed lines. This is a tenth above it.
 */
export const BASH_OUTPUT_MAX_CHARS = 24_000;

/**
 * The soft turn limit of a subagent: at this many tool calls of one agent of the type, a line asks it to stop and report (task 19.10).
 * The tool calls of the 57 subagent transcripts of 2026-10-26, each `tool_use_id` once, by `attributionAgent`:
 * `claudetto:Hephaestus` 23 runs, 6 to 95 (largest 95); `claudetto:Artemis` 8 runs, 11 to 70 (largest 70); `claudetto:Athena` 5 runs, 8 to 51 (largest 51); `claudetto:Hermes` 1 run, 8.
 * Each bound is about a quarter above the largest count, and `TURN_BOUND_DEFAULT` serves a type with no count.
 */
export const TURN_BOUNDS: Readonly<Record<string, number>> = {
  "claudetto:Hephaestus": 120,
  "claudetto:Artemis": 90,
  "claudetto:Athena": 65,
  "claudetto:Hermes": 30,
};

/** The bound of an agent type that `TURN_BOUNDS` lacks: the largest of them. */
export const TURN_BOUND_DEFAULT = 120;

/**
 * The tries of one versioned write of the `calls` state: a try fails when another write landed first, and the next try reads the new value.
 * Parallel calls of subagents land in one batch, and a batch holds at most a few tens of calls, so this is above that and ends a store that never takes a write.
 */
export const STATE_TRIES_MAX = 50;
