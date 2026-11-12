# surface-trim Specification

## Purpose
Claudetto runs in the CLI and the TUI only. Every surface that serves claude.ai, the web app, mobile, the cloud, or onboarding is turned off as far as Claude Code allows, and the request that each session sends is golfed down to the fewest characters that still finish the task.

## Requirements

### Requirement: A Shorter Score Is Not a Win on Its Own

A cut SHALL count as a saving only when billed cost per finished task does not rise. One study removed 38.4% of delivered tool-output tokens and raised billed cost by 6.8%, with a Pearson r of 0.15 between token and cost reduction (arXiv 2607.12161).

#### Scenario: Score Falls and Cost Rises

- **WHEN** a trim lowers the character score and the measured billed cost per task rises
- **THEN** the trim is reverted and the reading is recorded against it

### Requirement: No Non-CLI Surface in the Request

The system SHALL turn off each surface that serves claude.ai, the web app, mobile, the cloud, or onboarding, by a settings key, an environment variable, or a `permissions.deny` entry for the tool name. A reading of the request on the real login SHALL list every tool the request carries.

#### Scenario: A Non-CLI Tool Is in the Request

- **WHEN** the reading shows a tool that serves a non-CLI surface
- **THEN** setup denies it by name, or the `design.md` of the change that keeps it carries a line saying why it stays

#### Scenario: Workflow

- **WHEN** a session starts under claudetto
- **THEN** the request carries no `Workflow` definition, because the project uses worktrees and the tool serves Dynamic Workflows

### Requirement: A Deny Removes the Definition

The system SHALL use `permissions.deny` of a tool name as a size lever, not only as a gate.

#### Scenario: Denied Tool

- **WHEN** a tool name is in `permissions.deny`
- **THEN** the captured request holds no definition for that name

#### Scenario: Deny of an Absent Tool

- **WHEN** a name is denied that the request does not carry
- **THEN** the score does not change, and the entry is dropped unless a reading on the real login shows the tool

#### Scenario: The Reading of 2.1.311

- **WHEN** `Workflow`, `ScheduleWakeup`, and `ReportFindings` were denied on 2026-10-27 against the installed `2.1.311`
- **THEN** the first request fell from 42,676 to 30,510 characters with the same `system` and the same `messages`, so the whole 12,166-character difference was the three definitions
- **AND** that pair stays as it was taken; the same pair on `2.1.312` is 42,879 and 30,713, recorded in `d581df3b:openspec/changes/archive/2026-10-30-claudetto-restart/tasks.md`, so no live figure is kept here

### Requirement: No Deny for a Tool Whose Removal Raises the Request

The system MUST NOT add a `permissions.deny` entry for a tool whose removal was measured to raise the request. Measured in characters on `2.1.317` (measured before task 17.13, `e20d11df`): removing `ToolSearch` costs `+37,936` and removing `Skill` costs `+8,720`. Removing `Bash` saves `407` and takes the shell away, so it is not denied either.

#### Scenario: Deny of `ToolSearch`

- **WHEN** a change adds `ToolSearch` to `permissions.deny`
- **THEN** the setup test fails and names the measured `+37,936` characters

### Requirement: Every Key Is Verified and Every Combination Is Read

A key SHALL be written by setup only when it exists in the installed version, with its module and offset recorded, and only when a reading shows what it changes. A key SHALL be read in the combination that ships, not alone.

#### Scenario: A Lever That Costs

- **WHEN** a key lowers one part of the request and raises another
- **THEN** the row records both, and the key ships only in the combination that is a net cut. Measured example: `disableBundledSkills: true` alone raised the first request from 42,676 to 54,055 characters, because `Workflow` grew from 5,355 to 22,310 while `messages` fell from 8,095 to 2,519. With `Workflow` removed the pair gives 24,934.

#### Scenario: Two Keys with the Same Effect

- **WHEN** two keys produce byte-identical requests, as `enableWorkflows: false` and `disableWorkflows: true` did at 37,066 characters
- **THEN** setup writes one of them, and the row says what the other adds outside the request, or that nothing was found

### Requirement: A Trim Never Breaks Claudetto or the User's CLI

The system MUST NOT write a key that stops its own hooks, skills, or sideloaded plugin directory, and MUST NOT write a key that removes a command the user needs to run the CLI.

#### Scenario: Self-Disabling Key

- **WHEN** a candidate key is `disableAllHooks`, `disableSkillShellExecution`, `disableSideloadFlags`, or `disableCommandPluginSources`
- **THEN** setup does not write it, and the `design.md` of the change that keeps it carries the reason

#### Scenario: Login and Update Commands

- **WHEN** a candidate key removes `/login`, `/logout`, `/doctor`, or the updater
- **THEN** setup does not write it, because the user needs it to run the CLI

### Requirement: Density Is Allowed, Ambiguity Is Not

Prompt and config text MAY be dense and terse to lower the score. It MUST stay unambiguous to a model reading it cold, and the reading that shows a task still finishes SHALL accompany each cut.

#### Scenario: A Cut That Changes Behavior

- **WHEN** a shortened prompt piece changes what a model does on the task set
- **THEN** the cut is reverted, and the task set run is recorded in the doc

### Requirement: A Tool Text Ships Only While It Beats the Stock Text

The `tool.describe` hook keeps the shorter of our text and the engine's for each tool of `TOOL_TEXTS` and each of `DEFERRED_TOOLS`, so a text that is not shorter never reaches a request. The `Agent` text is the one exception. A check SHALL hold the stock length of each other overridden tool, from the `clawdipedia` route `prompts/tools`, and SHALL fail for a text that does not beat it. The always-loaded total SHALL count no text that no request carries.

#### Scenario: Where the Shorter Text Is Chosen

- **WHEN** the `tool.describe` hook keeps the shorter text (`surface.ts:189-198`)
- **THEN** a text that is not shorter never reaches a request

#### Scenario: Why the Agent Text Is the Exception

- **WHEN** `delegation.ts:96-99` sets `AGENT_TEXT`
- **THEN** it sets it with no length check, because the text names the claudetto agents and the engine's text does not

#### Scenario: Text Not Shorter Than the Stock Text

- **WHEN** a text of `TOOL_TEXTS` is as long as the stock description of that tool
- **THEN** the check fails, and such a text SHALL be shortened or dropped with its registration

#### Scenario: A Shorter Stock Text Is Kept

- **WHEN** the engine's description of a tool in `TOOL_TEXTS` is shorter than ours
- **THEN** the request carries the engine's (`surface.test.ts`, "a stock description shorter than ours is kept")

#### Scenario: The Agent Text

- **WHEN** the engine describes the `Agent` tool, at any length
- **THEN** the request carries `AGENT_TEXT` (`delegation.test.ts`, "the Agent text picks a type from the agent list or leaves the work to the caller")

#### Scenario: Stub Longer Than Every Stock Text

- **WHEN** a check compares a text against a stub that is longer than every stock description
- **THEN** that check is no evidence that the text reaches a request

#### Scenario: Tool That the Engine Defers

- **WHEN** the engine leaves a tool off the base prompt by default
- **THEN** its text is conditional, and the always-loaded total excludes it

### Requirement: Setup Writes the Approved `env` Flags

Setup SHALL write the 16 flags of D18 and `CLAUDE_CODE_THRIFTY_SONIC=0` (D14), and the code SHALL mark the last as unofficial with its source (`references.md:396` of the restart change).

#### Scenario: Flags Written

- **WHEN** setup writes to an empty settings file
- **THEN** `env` holds each of the 17 names with its value

### Requirement: Built-in Agents Are Withheld and Mapped

The system SHALL withhold each agent whose `source` is `built-in` with `agent.offer`, and SHALL map an `Agent` call's `subagent_type` to a claudetto agent: `Explore` to `claudetto:search`, `Plan` to `claudetto:plan`, `general-purpose`, `claude`, or a missing type to `claudetto:work`, and a bare name of the four to its `claudetto:` form. A call whose type is not the mapped `claudetto:` name SHALL be denied with the exact form to send, never rewritten, because a rewritten input voids auto mode's review of every call in the response. A type claudetto does not map, such as `fork` or `statusline-setup`, SHALL pass through unchanged.

#### Scenario: An Untyped Call

- **WHEN** the model calls `Agent` with no `subagent_type`, or with `general-purpose` or `claude`
- **THEN** the hook denies it, and the denial names `claudetto:work` as the type to send

#### Scenario: A Withheld Agent with No Mapping

- **WHEN** the model calls `Agent` with `statusline-setup`
- **THEN** the hook passes the call unchanged, and the engine decides it
- **AND** the lab test is `delegation.test.ts`, "statusline-setup passes through unchanged"

### Requirement: A Mapped Agent Call Runs in the Foreground and Is Rewritten Only When It Must Be

A call to `search`, `plan`, or `sweep` SHALL carry `run_in_background`, because a plugin agent runs in the background otherwise (`settings-review.txt`, L17 item 3); a call that omits it SHALL be denied with the exact form, which sets `run_in_background: false`. A call that needs no change SHALL reach `next(e)` as `e` itself, because in auto mode a rewritten call sends it and every later call of the same response to the local classifier (L17 item 10 (g)).

#### Scenario: A Search Call with No Background Field

- **WHEN** the model calls `Agent` with `Explore` and no `run_in_background`
- **THEN** the hook denies it, and the denial names `claudetto:search` with `run_in_background: false`

#### Scenario: A Call Written in Full

- **WHEN** the model names `claudetto:search` with `run_in_background: false`
- **THEN** the hook passes the call unchanged, and the `--debug-file` of an auto-mode run holds no "a hook rewrote" line for it

### Requirement: Built-in Tools That No Mod Removes Are Denied

Setup SHALL write `permissions.deny` for `Workflow`, `ScheduleWakeup`, `ReportFindings`, `CronCreate`, `CronDelete`, `CronList`, `EnterPlanMode`, and `ExitPlanMode`, because no Mod answer removes a built-in tool and a `settings.read` answer does not reach the permission rules (`settings-review.txt`, L17 item 2, dis1, dis2, st1-st5).

#### Scenario: A Search for a Denied Tool

- **WHEN** the model runs `ToolSearch` after setup
- **THEN** it finds none of the eight names

### Requirement: Local Commands Off in Claudetto Are Hidden and Answer Locally

The system SHALL answer each of the 27 local commands of L17 item 8 with `command.run` `{ text: "/<name> is off in claudetto." }` and hide it with `command.describe` `isHidden: true`.

#### Scenario: A Typed Off Command

- **WHEN** the user types one of the 27 names in the TUI
- **THEN** the text answers with 0 requests, and `/help` lists 60 names against 80 stock

### Requirement: A Whole Read of a Heavy File Is Denied

With `readGuardEnabled` not `false`, a `Read` with no `limit` of a lock, minified, map, or build file, or of a file under a generated folder, SHALL be denied with a hint to pass `offset` and `limit`, to use `rg`, or to use the package command (`feature-map.md`, "Read guard").

#### Scenario: Whole Lock File

- **WHEN** the model reads `bun.lock` with no `limit`
- **THEN** the call is denied with the hint

#### Scenario: Part of a Lock File

- **WHEN** the model reads `bun.lock` with a `limit`
- **THEN** the read runs

### Requirement: A Bun Repo Is Told It Uses Bun

With `bunRuleEnabled` not `false`, a session that starts, clears, or compacts in a folder holding `package.json` and `bun.lock` SHALL receive one fact line that the repo uses `bun`. The rule to use `bun` lives in the root prompt (`feature-map.md`, "Bun rule").

#### Scenario: Bun Repo

- **WHEN** a session starts in a folder with both files
- **THEN** its context holds the fact line

#### Scenario: No Lock File

- **WHEN** the folder holds `package.json` and no `bun.lock`
- **THEN** no line is added

### Requirement: Tool Results Stay Folded

Claudetto SHALL NOT make the transcript draw a tool result in full outside the ctrl+o transcript, `--verbose`, or a row the person expanded. No `ui.render` hook SHALL set `isExpanded` on a `ToolGroup`.

#### Scenario: A Search Run

- **WHEN** the agent runs `grep -rn x .` with 127 lines of output, then an MCP search, in the default view
- **THEN** each result shows at most the engine's fold and "(ctrl+o to expand)"

#### Scenario: The Hook Is Gone

- **WHEN** `plugins/claudetto/hooks/` is read
- **THEN** no hook sets `isExpanded`, and `fold.ts` and its entry in `register.ts` are deleted

#### Scenario: The Person Asks for All

- **WHEN** the person presses ctrl+o
- **THEN** every result shows in full, as the engine draws it

### Requirement: The Agent Listing Keeps Only Its Agent Lines

The `agent_listing_delta` attachment SHALL be cut to the lines that start with `- `, joined by newlines, because the engine's header and footer cost bytes that the agent lines do not. An attachment whose `text` is `null` SHALL pass unchanged, and any other attachment type SHALL pass unchanged.

#### Scenario: Header and Footer

- **WHEN** the listing holds a header line, three `- ` agent lines, and a footer line
- **THEN** the model sees the three agent lines only (`delegation.test.ts`, "the listing keeps only its agent lines")

#### Scenario: Another Attachment

- **WHEN** an attachment of another type arrives
- **THEN** it is left as it is ("another attachment is left as it is")

### Requirement: Rarely Called Tools Load Through ToolSearch

`DEFERRED_TOOLS` SHALL hold `Skill`, `Workflow`, `ScheduleWakeup`, and `ReportFindings` (`surface.ts:14-19`). Each SHALL be sent deferred, with our text where it is shorter, only when the session's tool list holds `ToolSearch`.

#### Scenario: ToolSearch Present

- **WHEN** the session lists `ToolSearch` and the engine describes `Workflow`
- **THEN** the answer has `isDeferred` true (`surface.test.ts`, "`Workflow` goes behind ToolSearch with its stock text")

### Requirement: A Session with No ToolSearch Lists Deferred Tools in Full

A session with no `ToolSearch` SHALL list the four tools of `DEFERRED_TOOLS` in full, because a flag set later would send a tool deferred from the second request on and rewrite the cache.

#### Scenario: No ToolSearch

- **WHEN** the session has no `ToolSearch`
- **THEN** each of the four stays in the list ("`Workflow` stays in the list when the session has no ToolSearch")

### Requirement: Read, Write, and ListAgents Stay Loaded

`Read`, `Write`, and `ListAgents` SHALL stay loaded in full, on the measurements of tasks 18.18 and 18.23 named at `surface.ts:13`.

#### Scenario: Loaded in Full

- **WHEN** the engine describes `Read`, `Write`, or `ListAgents`
- **THEN** each of the three stays loaded in full

### Requirement: Bundled Skills Are Turned Off

On `settings.read` with no `source`, the hook SHALL set `skillOverrides` to `off` for each of the 18 names of `OFF_SKILLS` (`surface.ts:106-125`), except a name that a folder of `.claude/skills`, `.claude/commands`, `<config>/skills`, or `<config>/commands` holds, where `<config>` is `CLAUDE_CONFIG_DIR` or `$HOME/.claude`.

#### Scenario: A Held Name

- **WHEN** the user has `.claude/skills/debug/`
- **THEN** `debug` is not set to `off` and the other 17 are (`surface.test.ts`, "Rule K: the 18 prompt commands go off, but not a name a user skill holds")

### Requirement: The User's Skill Override Wins

A `skillOverrides` entry that the user's settings hold SHALL win over ours.

#### Scenario: The User's Own Override

- **WHEN** the settings hold `skillOverrides.batch` as `on`
- **THEN** `batch` stays `on`

### Requirement: The Skill Check Reads Only Four Folders

The hook SHALL make only the four `$fs.list` calls and nothing else, and a folder that cannot be listed SHALL count as empty.

#### Scenario: An Unlistable Folder

- **WHEN** `.claude/commands` cannot be listed
- **THEN** it counts as empty and the other folders are still read

### Requirement: Plan Mode and the `/init` Interview Use Short Texts

In plan mode the full reminder (`detail.reminder` `full`) SHALL be replaced by `planModeText` when that text is shorter than the engine's, and SHALL name the plan file and tell the model to read and edit it when `hasPlan` is true, else to build it with `Write` and `Edit`. A sparse reminder, a row without its facts, or an engine text that is shorter SHALL pass unchanged.

#### Scenario: Full Reminder

- **WHEN** the engine sends the full plan mode reminder with a plan file path
- **THEN** the model gets the shorter text naming that path (`surface.test.ts`, "the full plan mode reminder is replaced by a shorter one naming the plan file")

#### Scenario: A Plan Already Written

- **WHEN** `hasPlan` is true
- **THEN** the text says to read the plan, then edit it step by step ("a plan file that already holds a plan is read before it is edited")

#### Scenario: Reminders That Stay

- **WHEN** the reminder is sparse, the engine text is shorter, or the row has no facts
- **THEN** the engine text is kept ("the sparse reminder is kept", "an engine plan mode text shorter than ours is kept", "a plan mode row without its facts is kept")

### Requirement: The Init Interview Replaces the Built-in Init Prompt

The built-in `/init` skill's prompt SHALL be replaced by `INTERVIEW_TEXT`, which has the model read the repo and the memory files, ask through `AskUserQuestion` what they leave out and which of five scopes each instruction belongs to, and write only after a yes to each draft. A user's own skill named `init` SHALL keep its text.

#### Scenario: Init

- **WHEN** the built-in `init` skill prompt is built
- **THEN** the model gets the interview, and a user's skill named `init` keeps its text ("the built-in init skill reaches the model as the interview", "a user's own skill named init keeps its text")

### Requirement: The Silent Turn Reminder Is Ours

Setup SHALL write `env.CLAUDE_CODE_SILENT_TURN_REMINDER_TEXT` as `SILENT_TURN_REMINDER` (`texts.ts:510`, `settings.ts:162`), because the server's text asks the model to say in a few words what it is doing, which draws a narration line. Our text SHALL ask for one sentence on a finding or result, and nothing about the next call.

#### Scenario: Setup Writes It

- **WHEN** the user picks "Features off" in setup
- **THEN** `env.CLAUDE_CODE_SILENT_TURN_REMINDER_TEXT` holds `SILENT_TURN_REMINDER` (`setup.test.ts`, "a clean write holds each planned key, only in the settings file, and no subagentStatusLine")

### Requirement: The Bash Text Names the File Commands

The claudetto `Bash` text SHALL name `cat`, `head`, `tail`, `sed`, `awk`, and `echo` as the shell commands that read or change a file, as the stock text does: files go through `Read`, `Edit`, `Write`, and the search tools unless the user asks for a shell command, so the agent does not reach for them and the gate need not refuse the call.

#### Scenario: The Text Names Each Command

- **WHEN** `TOOL_TEXTS["Bash"]` is read
- **THEN** it holds each of the six names in backticks

### Requirement: Monitor, ToolSearch, and the Plan-Mode Tools Carry a Text of Ours

`TOOL_TEXTS` SHALL hold a text of at most 200 characters for `Monitor`, `ToolSearch`, `EnterPlanMode`, and `ExitPlanMode`, because each sent a stock description of 953 to 6,354 characters that no hook cut. Claudetto SHALL set no deferral for any of the four: the engine defers `Monitor` and the plan-mode tools itself, and `ToolSearch` stays loaded.

#### Scenario: The Monitor Text

- **WHEN** `TOOL_TEXTS["Monitor"]` is read
- **THEN** it says that a notice is not the user's reply, that the command prints only the lines the model acts on, failures among them, and that one notice is the job of `Bash` with `run_in_background`
- **AND** it says to run the writer itself in the command, because `tail -F` never ends after its writer exits and so the watch never ends

#### Scenario: The Four Texts

- **WHEN** the engine describes `Monitor`, `ToolSearch`, `EnterPlanMode`, or `ExitPlanMode` with a longer stock description
- **THEN** the answer holds our text and no `isDeferred` of ours
- **AND** the lab tests are `surface.test.ts`, "tool.describe sends our Monitor text, deferred only for Skill among them" and its three siblings, and "Monitor, ToolSearch, and the plan-mode tools each carry a text of ours"

### Requirement: The Task Tools Carry a Shorter Text of Ours

`TOOL_TEXTS` SHALL hold a text for `TaskCreate`, `TaskGet`, `TaskList`, and `TaskUpdate`, each shorter than its stock description of 2,146, 732, 998, and 2,243 characters, and no setting or schema of the tools changes.

#### Scenario: The Four Task Texts

- **WHEN** the engine describes `TaskCreate`, `TaskGet`, `TaskList`, or `TaskUpdate` with its stock description
- **THEN** the answer holds our text, shorter than the stock one
- **AND** the lab test is `surface.test.ts`, "TaskCreate gets our text, shorter than the stock one" and its three siblings

### Requirement: The Agent Text Sends a Committing Agent to a Worktree of Its Own

The `Agent` description SHALL tell the model to set `isolation: "worktree"` on an agent that commits, because agents that commit in one working tree block each other at the pre-commit hook. The hook SHALL pass a call that names `isolation` to the engine unchanged, and no agent definition SHALL set `isolation`, since a worktree holds the changes of an agent that does not commit.

#### Scenario: The Description

- **WHEN** the engine describes `Agent`
- **THEN** the text names `isolation: "worktree"` for an agent that commits

#### Scenario: A Call Naming Isolation

- **WHEN** the model calls `Agent` with `isolation: "worktree"`
- **THEN** the call reaches `next(e)` as `e` itself
