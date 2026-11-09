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

The `tool.describe` hook keeps the shorter of our text and the engine's, so a text that is not shorter never reaches a request. A check SHALL hold the stock length of each overridden tool, from the `clawdipedia` route `prompts/tools`, and SHALL fail for a text that does not beat it. Such a text SHALL be shortened or dropped, and the always-loaded total SHALL count no text that no request carries.

#### Scenario: Text Not Shorter Than the Stock Text

- **WHEN** a text of `TOOL_TEXTS` is as long as the stock description of that tool
- **THEN** the check fails, and the text is shortened or dropped with its registration

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

The system SHALL withhold each agent whose `source` is `built-in` with `agent.offer`, and SHALL map an `Agent` call by its `subagent_type`: `Explore` to `claudetto:Artemis`, `Plan` to `claudetto:Metis`, and `general-purpose`, `claude`, or a missing type to `claudetto:Heracles`. A bare or `claudetto:`-prefixed name of the three SHALL map to itself, and `fork` SHALL pass through.

#### Scenario: An Untyped Call

- **WHEN** the model calls `Agent` with no `subagent_type`, or with `general-purpose` or `claude`
- **THEN** `claudetto:Heracles` runs

#### Scenario: A Withheld Agent with No Mapping

- **WHEN** the model calls `Agent` with `statusline-setup`
- **THEN** the call fails as "not found", and the listing of the first request names only claudetto's agents

### Requirement: A Mapped Agent Call Runs in the Foreground and Is Rewritten Only When It Must Be

The call SHALL carry `run_in_background: false` for Artemis and Metis unless the caller set it, because a plugin agent runs in the background otherwise (`settings-review.txt`, L17 item 3). A call that needs no change SHALL reach `next(e)` as `e` itself, because in auto mode a rewritten call sends it and every later call of the same response to the local classifier (L17 item 10 (g)).

#### Scenario: A Search Call with No Background Field

- **WHEN** the model calls `Agent` with `Explore` and no `run_in_background`
- **THEN** `claudetto:Artemis` runs with `run_in_background: false`

#### Scenario: A Call Written in Full

- **WHEN** the model names `claudetto:Artemis` with `run_in_background: false`
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
