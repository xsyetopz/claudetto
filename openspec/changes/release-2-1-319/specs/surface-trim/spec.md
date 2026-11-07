## MODIFIED Requirements

### Requirement: A Trim Never Breaks Claudetto or the User's CLI

The system MUST NOT write a key that stops its own hooks, skills, or sideloaded plugin directory, and MUST NOT write a key that removes a command the user needs to run the CLI.

#### Scenario: Self-Disabling Key

- **WHEN** a candidate key is `disableAllHooks`, `disableSkillShellExecution`, `disableSideloadFlags`, or `disableCommandPluginSources`
- **THEN** setup does not write it, and the `design.md` of the change that keeps it carries the reason

#### Scenario: Login and Update Commands

- **WHEN** a candidate key removes `/login`, `/logout`, `/doctor`, or the updater
- **THEN** setup does not write it, because the user needs it to run the CLI

### Requirement: No Deny for a Tool Whose Removal Raises the Request

The system MUST NOT add a `permissions.deny` entry for a tool whose removal was measured to raise the request. Measured in characters on `2.1.317` (measured before task 17.13, `e20d11df`): removing `ToolSearch` costs `+37,936` and removing `Skill` costs `+8,720`. Removing `Bash` saves `407` and takes the shell away, so it is not denied either.

#### Scenario: Deny of `ToolSearch`

- **WHEN** a change adds `ToolSearch` to `permissions.deny`
- **THEN** the setup test fails and names the measured `+37,936` characters

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
- **AND** that pair stays as it was taken; the same pair on `2.1.312` is 42,879 and 30,713, recorded in `openspec/changes/archive/2026-10-30-claudetto-restart/tasks.md`, so no live figure is kept here

### Requirement: No Non-CLI Surface in the Request

The system SHALL turn off each surface that serves claude.ai, the web app, mobile, the cloud, or onboarding, by a settings key, an environment variable, or a `permissions.deny` entry for the tool name. A reading of the request on the real login SHALL list every tool the request carries.

#### Scenario: A Non-CLI Tool Is in the Request

- **WHEN** the reading shows a tool that serves a non-CLI surface
- **THEN** setup denies it by name, or the `design.md` of the change that keeps it carries a line saying why it stays

#### Scenario: Workflow

- **WHEN** a session starts under claudetto
- **THEN** the request carries no `Workflow` definition, because the project uses worktrees and the tool serves Dynamic Workflows

## REMOVED Requirements

### Requirement: Built-in Agents Are Denied

**Reason**: The user chose route A, one Mod, for the built-in agents (D4; `settings-review.txt`, L17 item 1). An `agent.offer` hook withholds them and a `tool.call` hook maps their names to claudetto's agents, so a call that names `Explore`, `Plan`, or `general-purpose` still runs, where a deny rule refuses it.
**Migration**: See "Built-in Agents Are Withheld and Mapped" in this capability.

### Requirement: The Golf Score Is Measured, Not Claimed

**Reason**: It scored the first request on the fake Messages API of the probing tool `claudekit/`, which left this repo under task 17.13 (`e20d11df`). The first-request readings of this change are in `openspec/changes/release-2-1-319/footprint.md`, "First request, cached prefix, and hook latency (task 7.5)", and `openspec/changes/release-2-1-319/evidence/18-15/`.
**Migration**: None.

## ADDED Requirements

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
