# Tool Use Counts for D20

Task 10.10 of `0-3-0-alpha-2`.
D20 defers each tool that is on, that is not a tool the roster uses each session, and that fewer than 10% of the sessions in `research/` use.

## Method

- Data: the 292 session files of `~/.claude/projects/*/*.jsonl` whose first `timestamp` is from 2026-10-18 to 2026-10-22, the same 292 as `research/sessions.md` (Scope).
- A session uses a tool when its main file, or a file in its `<session>/subagents/` folder, holds one `tool_use` block of that name in an `assistant` message.
- The count is sessions, not calls, so one session with 500 `Bash` calls counts once.
- The script is `/tmp/d20-count/count.py` (Python, run with `-I`), run on 2026-10-23: `python3 -I count.py '~/.claude/projects' 2026-10-18 2026-10-22`.
- Tools that are on: the `keep` and `replace` rows of `tools/builtins/verdicts/tools.ts` that a coding session offers, less `NotebookEdit` and `PushNotification` (D20 turns both off).
- Roster tools (never deferred): the `tools:` lines of `agents/researcher.md`, `reviewer.md`, `scout.md`, and `worker.md` (`Read`, `Edit`, `Write`, `Grep`, `Glob`, `Bash`, `Monitor`, `WebSearch`, `WebFetch`), and `Agent` and `SendMessage` of `agents/main.md`.
- Also never deferred: `ToolSearch` (it cannot be deferred), and `SubagentHandback` and `StructuredOutput` (they end a run, and a deferred tool needs a `ToolSearch` call first).
- The bound and the table are `DEFER_BELOW_PERCENT` and `TOOL_SESSION_USE` in `plugins/claudetto/slices/prompt/limits.ts`, and `DEFERRED_TOOLS` of `slices/prompt/domain/tools.ts` derives the list from them.

## Table

| Tool | Sessions | Share | Roster or engine | Result |
|---|---|---|---|---|
| `Bash` | 262 | 89.7% | roster | loaded |
| `Agent` | 196 | 67.1% | roster | loaded |
| `SubagentHandback` | 195 | 66.8% | ends a run | loaded |
| `Write` | 126 | 43.2% | roster | loaded |
| `Read` | 124 | 42.5% | roster | loaded |
| `SendMessage` | 112 | 38.4% | roster | loaded |
| `AskUserQuestion` | 96 | 32.9% | - | loaded |
| `ToolSearch` | 84 | 28.8% | engine | loaded |
| `Edit` | 67 | 22.9% | roster | loaded |
| `Monitor` | 26 | 8.9% | roster | loaded |
| `Skill` | 23 | 7.9% | - | deferred |
| `WebFetch` | 14 | 4.8% | roster | loaded |
| `Grep` | 11 | 3.8% | roster | loaded |
| `WebSearch` | 4 | 1.4% | roster | loaded |
| `ListAgents` | 3 | 1.0% | - | deferred |
| `Glob` | 2 | 0.7% | roster | loaded |
| `EnterWorktree`, `ExitWorktree`, `LSP`, `TodoWrite`, `ListMcpResourcesTool`, `ReadMcpResourceTool`, `ReadMcpResourceDirTool`, `Workflow` | 0 | 0% | - | deferred |
| `StructuredOutput` | 0 | 0% | ends a run | loaded |

## Result

- 10 tools are deferred: `EnterWorktree`, `ExitWorktree`, `LSP`, `ListAgents`, `ListMcpResourcesTool`, `ReadMcpResourceDirTool`, `ReadMcpResourceTool`, `Skill`, `TodoWrite`, and `Workflow`.
- `Skill` (7.9%) keeps its shorter claudetto text and is deferred too.
- `TodoWrite` has 0 sessions because the sessions of the user used `Task*` tools and the todo list of the engine, and the snippet denies `Task*`.
- `Monitor` (8.9%) stays loaded, because `worker` uses it.
- `EnterWorktree` and `ExitWorktree` stay in the paired test of task 11.8 (D20, "Decided by a test"). Deferring them does not change that test.

## Limits

- The 5 days are mostly work on claudetto, so a tool that other projects need, such as `LSP` in a Swift project, can show 0.
  A user turns such a tool on again with a `ToolSearch` call, and the bound is one number in `limits.ts`.
- The count reads `tool_use` blocks, so a tool that the engine runs for a user command (a `/skill` command) is not a use.
