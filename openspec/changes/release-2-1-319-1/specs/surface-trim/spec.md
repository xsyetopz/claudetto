## ADDED Requirements

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
- **THEN** none is deferred ("Read and Write are sent in full, not behind ToolSearch", "DEFERRED_TOOLS is Skill, Workflow, ScheduleWakeup, ReportFindings, and ListAgents stays loaded (18.18)")

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

The built-in `/init` skill's prompt SHALL be replaced by `INTERVIEW_TEXT`, which has the model read the repo and the memory files, ask through `mcp__claudetto__ask-user-question` what they leave out and which of five scopes each instruction belongs to, and write only after a yes to each draft. A user's own skill named `init` SHALL keep its text.

#### Scenario: Init

- **WHEN** the built-in `init` skill prompt is built
- **THEN** the model gets the interview, and a user's skill named `init` keeps its text ("the built-in init skill reaches the model as the interview", "a user's own skill named init keeps its text")

### Requirement: The Silent Turn Reminder Is Ours

Setup SHALL write `env.CLAUDE_CODE_SILENT_TURN_REMINDER_TEXT` as `SILENT_TURN_REMINDER` (`texts.ts:510`, `settings.ts:162`), because the server's text asks the model to say in a few words what it is doing, which draws a narration line. Our text SHALL ask for one sentence on a finding or result, and nothing about the next call.

#### Scenario: Setup Writes It

- **WHEN** the user picks "Features off" in setup
- **THEN** `env.CLAUDE_CODE_SILENT_TURN_REMINDER_TEXT` holds `SILENT_TURN_REMINDER` (`setup.test.ts`, "a clean write holds each planned key, only in the settings file, and no subagentStatusLine")

## MODIFIED Requirements

### Requirement: A Tool Text Ships Only While It Beats the Stock Text

The `tool.describe` hook keeps the shorter of our text and the engine's for each tool of `TOOL_TEXTS` and each of `DEFERRED_TOOLS`, so a text that is not shorter never reaches a request (`surface.ts:189-198`). The `Agent` text is the one exception: `delegation.ts:96-99` sets `AGENT_TEXT` with no length check, because the text names the claudetto agents and the engine's text does not. A check SHALL hold the stock length of each other overridden tool, from the `clawdipedia` route `prompts/tools`, and SHALL fail for a text that does not beat it. Such a text SHALL be shortened or dropped, and the always-loaded total SHALL count no text that no request carries.

#### Scenario: Text Not Shorter Than the Stock Text

- **WHEN** a text of `TOOL_TEXTS` is as long as the stock description of that tool
- **THEN** the check fails, and the text is shortened or dropped with its registration

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
