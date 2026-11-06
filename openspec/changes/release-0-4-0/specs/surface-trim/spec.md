## REMOVED Requirements

### Requirement: Built-in Agents Are Denied

**Reason**: The user chose route A, one Mod, for the built-in agents (D4; `settings-review.txt`, L17 item 1). An `agent.offer` hook withholds them and a `tool.call` hook maps their names to claudetto's agents, so a call that names `Explore`, `Plan`, or `general-purpose` still runs, where a deny rule refuses it.
**Migration**: See "Built-in Agents Are Withheld and Mapped" in this capability.

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
