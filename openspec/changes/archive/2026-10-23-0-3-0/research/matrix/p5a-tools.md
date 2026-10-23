# Replace Matrix: Built-In Tools

Source of the costs: `claude-code-docs/docs/how-it-works/context-budget.md:62` (one tool removed at a time from the empty session of 12,524 tokens, Claude Code `2.1.305`, Opus 5.5).
Source of the flags and the deferred state: `claude-code-docs/docs/reference/tools/*.md`.
The 0.2.0 state is from `src/plugins/claudetto/slices/prompt/slice.ts:140` to `src/plugins/claudetto/slices/prompt/slice.ts:232`.
A deferred tool costs only its name in the deferred list until `ToolSearch` loads it (`context-budget.md:81`).
A change to the tool list breaks the cache once (`context-budget.md:217`), so each deny goes into the snippet that setup writes, and no hook changes the list in a session.

## Loaded Tools

| Name | Source | Decision | Reason and saving |
| --- | --- | --- | --- |
| `Read`, `Write`, `Edit` | `reference/tools/files.md` | keep | Core tools. |
| `Bash` | `reference/tools/shell-and-web.md:20` | keep | A deny adds `Glob` and `Grep` in its place, +384 tokens (`context-budget.md:72`). |
| `Glob`, `Grep` | `reference/tools/files.md:24` | keep | Read-only and parallel, and `scout` needs them. This session loads them, but `context-budget.md:79` lists them as not loaded by default. The cause is open. |
| `Agent` | `reference/tools/agents-and-tasks.md` | keep | Needed for the roster. `agent.offer` cuts its agent list (D2). |
| `Skill` | `context-budget.md:73` | keep | A deny costs +5,599 tokens. |
| `ToolSearch` | `context-budget.md:74` | keep | A deny costs +15,898 tokens. |
| `AskUserQuestion` | `reference/tools/agents-and-tasks.md` | keep | D9 needs it for each decision. |
| `ListAgents` | `context-budget.md:69` | keep | Gated, and deferred in this session. After a compaction or a handoff, it is the only way to find a running agent (used in this session). Loaded, it costs 345 tokens. |
| `Workflow` | `context-budget.md:64` | keep `enableWorkflows: false` | 0.2.0 sets it. Saves 1,969 tokens. |
| `ScheduleWakeup` | `context-budget.md:65` | keep deny | 0.2.0 denies it. Saves 1,675 tokens. |
| `ReportFindings` | `context-budget.md:67` | keep deny | 0.2.0 denies it. Saves 807 tokens. |
| `SubagentHandback` | `reference/tools/agents-and-tasks.md` | keep default | Only inside a subagent. |
| `StructuredOutput` | `reference/tools/gated-and-other.md` | n/a | Only for `--json-schema` runs. |

## Deferred Tools

| Name | Source | Decision | Reason and saving |
| --- | --- | --- | --- |
| `Monitor` | `reference/tools/shell-and-web.md:22` | keep | D9 needs it to wait for a background command. |
| `TaskStop` | `reference/tools/shell-and-web.md:25` | drop the 0.2.0 deny (`src/plugins/claudetto/slices/prompt/slice.ts:230`) | It is the only way to stop a `persistent` `Monitor` or a background agent (`shell-and-web.md:51`). The deny saves only the name. |
| `WebFetch` | `reference/tools/shell-and-web.md:23` | keep, replace rejected | It applies a prompt to the page with a small model. A claudetto fetch tool sends the raw page to the main model, which costs more for each large page. |
| `WebSearch` | `reference/tools/shell-and-web.md:24` | keep | No cheaper search without an API key of the user. |
| `SendMessage` | `reference/tools/agents-and-tasks.md` | keep | Resumes a stopped agent. |
| `EnterWorktree`, `ExitWorktree`, `NotebookEdit` | `reference/tools/` | keep | Name only. |
| `TaskCreate`, `TaskGet`, `TaskList`, `TaskUpdate` | `reference/tools/agents-and-tasks.md` | keep deny | 0.2.0 denies them. Name only, unmeasured. |
| `TodoWrite` | `reference/tools/agents-and-tasks.md` | keep default | Gated by `CLAUDE_CODE_ENABLE_TASKS`. The env sweep decides (`p1-env-vars.md`). |
| `EnterPlanMode`, `ExitPlanMode` | `reference/tools/agents-and-tasks.md` | keep deny | 0.2.0 denies them. |
| `CronCreate`, `CronDelete`, `CronList` | `reference/tools/agents-and-tasks.md` | keep off | `CLAUDE_CODE_DISABLE_CRON=1` (0.2.0). |
| `DesignSync`, `RemoteTrigger` | `reference/tools/gated-and-other.md` | set deny (proposed) | No use in claudetto. Saves 2 names on each request, unmeasured. |
| `PushNotification`, `EndConversation` | `reference/tools/gated-and-other.md` | keep | Name only. |
| `ProposeGoal` | `reference/tools/agents-and-tasks.md` | set `modelProposedGoals: "disabled"` | D6. |
| `LSP` | `reference/tools/files.md` | n/a | Only with an LSP plugin, and setup offers none (A6). |
| `memory_read`, `memory_write`, `memory_list` | `reference/tools/files.md` | n/a | Gated. Memory is off. |
| `mcp__computer-use` | `src/plugins/claudetto/slices/prompt/slice.ts:222` | keep deny | 0.2.0 denies it. |
| Advisor | `configure/env-vars/tools-and-bash.md:60` | keep `CLAUDE_CODE_DISABLE_ADVISOR_TOOL=1` | D6. The claudetto `advise` tool goes too. |
| `Artifact` | `reference/tools/gated-and-other.md` | keep `enableArtifact: false` | 0.2.0 sets it. |
| `PowerShell`, `WaitForMcpServers`, MCP resource tools | `reference/tools/` | n/a | Not on macOS and Linux, tool search on, or no MCP resources. |
| Other gated tools (`ReadNotifications`, `ShareOnboardingGuide`, `ShowOnboardingRolePicker`, `OfferChromeSetup`, `SendUserMessage`, `SendFeedback`, `SuggestPluginInstall`, `SuggestSkills`, `FetchInboxMessage`, `PublishPlugin`, `AppifactRepl`, `SendFile`, `Poll`, `ClaudeDesign`, `Projects`, `SearchMcpRegistry`, `SuggestConnectors`, `ListConnectors`, `SendUserFile`, `propose_skills`, `GetTask`) | `reference/tools/gated-and-other.md` | keep default | Behind server flags. |

## Open

- Why this session loads `Glob` and `Grep`.
  One `/context` run in a fresh session answers it (a paid run, ask first).
- No built-in tool has a cheaper claudetto replacement with the same result, so A13 replaces no tool here.
  A13 applies to the slices `goal` and `advise` (D6).
