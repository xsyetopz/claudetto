# settings-profile Specification

## Purpose

Defines the settings that dotclaude setup writes, how it merges them into user files, and the rules that protect user data such as session transcripts.

## Requirements

### Requirement: Session retention left to the user

The profile SHALL NOT set `cleanupPeriodDays`, so that the Claude Code default of 30 days applies.
Setup SHALL remove only the value 14 that the 0.27.0 profile wrote, and keep any other value.

#### Scenario: User value

- **WHEN** the user settings have `cleanupPeriodDays: 400`
- **THEN** setup keeps 400

#### Scenario: No value

- **WHEN** the user settings have no `cleanupPeriodDays`
- **THEN** setup writes no `cleanupPeriodDays`

#### Scenario: 0.27.0 value

- **WHEN** the user settings have `cleanupPeriodDays: 14`, the value of the 0.27.0 profile
- **THEN** setup asks to remove it, and tells the user that deleted transcripts cannot come back

### Requirement: Each key has a reason

The profile SHALL set a settings key or an `env` entry only when the Claude Code default does not give the needed result.
The wiki SHALL list each profile key and `env` entry with its reason and the Claude Code default.

#### Scenario: Key not listed

- **WHEN** the profile has a key or an `env` entry that the wiki list does not have
- **THEN** the profile test fails and names it

### Requirement: Scope of each key

Setup SHALL write each key to a scope that Claude Code reads for that key.
A key that Claude Code ignores in project settings SHALL go to user settings or local settings.

#### Scenario: Sync key

- **WHEN** the user picks project scope
- **THEN** setup writes `syncClaudeAiSkills` to user or local settings, and tells the user where it went

### Requirement: Backup before write

Setup SHALL copy each settings file before it writes to it, and keep the newest 3 copies.

#### Scenario: Second run

- **WHEN** setup runs a second time
- **THEN** a new backup exists next to the file

### Requirement: Dry run

Setup SHALL show the full diff of each file before it writes, and write only after the user confirms.

#### Scenario: User declines

- **WHEN** the user declines the diff
- **THEN** no settings file changes

### Requirement: Migration from 0.27.0

Setup SHALL change a 0.27.0 profile to the 0.28.0 profile.
It SHALL remove only the keys and files that an earlier dotclaude version wrote.

#### Scenario: 0.27.0 status line

- **WHEN** the user settings have the 0.27.0 `statusLine` entry
- **THEN** setup changes it to the 0.28.0 entry and keeps the other keys of the user

### Requirement: Git instructions

The profile SHALL set `includeGitInstructions` to `false` only if the system prompt variant carries the commit attribution line and the eval suite shows no loss in resolve rate or behavior from it.

#### Scenario: Eval result recorded

- **WHEN** the profile sets `includeGitInstructions: false`
- **THEN** the wiki links the eval report that supports it
- **AND** a commit made in a session with the profile ends with the attribution trailer

### Requirement: Effort cap and model list

The profile SHALL set `maxEffortLevel` to `max`, `availableModels` to the four models of the roster (with Mythos 5.1 in place of Fable 5.1 for a CVP account), and `enforceAvailableModels` to `true`.
Setup SHALL change a 0.27.0 value of `maxEffortLevel` and `claude-haiku-4-5` entries after the user confirms the diff.

#### Scenario: 0.27.0 profile

- **WHEN** the user settings have `maxEffortLevel: "xhigh"` and `claude-haiku-4-5` in `availableModels`
- **THEN** setup shows the change to `max` and the removal of the old model, and writes it only after the user confirms

### Requirement: Schema reference

Each settings template SHALL name the generated dotclaude schema as `$schema`.

#### Scenario: Template validates

- **WHEN** the schema check validates the templates against the generated schema
- **THEN** each key is known and each value has the right type

### Requirement: Subagent cache lifetime

The profile SHALL leave `subagentPromptCacheTtl` unset, which gives 5 minutes, until an eval shows that `"1h"` costs less.
The reason is the measure of 2026-10-05 (`wiki/Design.md`): 21,765 of 21,807 request gaps of subagents were under 5 minutes, so a 1-hour cache cost about $171 a week more at the documented write prices.
Setup SHALL offer `"1h"` as an eval-gated item, and the profile SHALL set it only when the eval shows a lower cost for each resolved task with no loss beyond the noise bound.
The profile SHALL NOT set `CLAUDE_CODE_SUBAGENT_PROMPT_CACHE_TTL`, because the setting is the documented route and the variable overrides it.

#### Scenario: Profile value

- **WHEN** the profile test reads the profile and no eval report shows a saving
- **THEN** the profile has no `subagentPromptCacheTtl` key

#### Scenario: Gated item

- **WHEN** an eval arm runs with the gated item on
- **THEN** the eval report gives the cost for each resolved task of both arms
