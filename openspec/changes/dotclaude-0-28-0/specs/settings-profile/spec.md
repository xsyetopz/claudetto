# Spec Delta

## Purpose

Defines the settings that dotclaude recommends, and where they live.
dotclaude writes no setting file and keeps no profile file (design D35).
The plugin `settings.json` holds the keys that Claude Code accepts in a plugin.
The wiki holds the other keys as a plain `settings.json` snippet that the user applies by hand.

## ADDED Requirements

### Requirement: Keys in the plugin and in the wiki

The plugin `settings.json` SHALL hold each recommended key that Claude Code accepts in a plugin settings file.
The wiki SHALL document each other recommended key as a plain `settings.json` snippet.
No code SHALL write, merge, diff, back up, or roll back a user settings file.
No `profile.json` or other dotclaude settings file SHALL exist.

#### Scenario: Plugin file

- **WHEN** a test reads the plugin `settings.json`
- **THEN** every key in it is one that Claude Code accepts in a plugin settings file
- **AND** the file validates against the generated schema

#### Scenario: No writer

- **WHEN** a test searches `plugins/` for code that writes a Claude Code settings file
- **THEN** it finds none

### Requirement: Session retention left to the user

The settings snippet and the plugin `settings.json` SHALL NOT set `cleanupPeriodDays`, so that the Claude Code default of 30 days applies.
The wiki SHALL tell the user to remove the value 14 that the 0.27.0 profile wrote, and SHALL say that deleted transcripts cannot come back.

#### Scenario: No value

- **WHEN** a test reads the snippet and the plugin `settings.json`
- **THEN** neither sets `cleanupPeriodDays`

### Requirement: Each key has a reason

The snippet SHALL set a settings key or an `env` entry only when the Claude Code default does not give the needed result.
The wiki SHALL list each snippet key and `env` entry with its reason and the Claude Code default.

#### Scenario: Snippet validates

- **WHEN** a test extracts the JSON block of the snippet from the wiki page
- **THEN** it validates against the generated schema, and an unknown key fails the test and names the key

### Requirement: Scope of each key

The wiki SHALL state, for each snippet key, the scope that Claude Code reads for that key.
A key that Claude Code ignores in project settings SHALL be marked as user or local only.

#### Scenario: Sync key

- **WHEN** a reader looks up `syncClaudeAiSkills` in the wiki
- **THEN** the page marks it as a user or local setting and not a project setting

### Requirement: Git instructions

The snippet SHALL set `includeGitInstructions` to `false` only if the system prompt variant carries the commit attribution line and the eval suite shows no loss in resolve rate or behavior from it.

#### Scenario: Eval result recorded

- **WHEN** the snippet sets `includeGitInstructions: false`
- **THEN** the wiki gives the date and the figures of the eval run that supports it
- **AND** a commit made in a session with the snippet applied ends with the attribution trailer

### Requirement: Effort cap and model list

The snippet SHALL set `maxEffortLevel` to `max`, `availableModels` to the four models of the roster, and `enforceAvailableModels` to `true`.
The wiki SHALL document the CVP case as a procedure: an account in CVP replaces `claude-fable-5-1` with `claude-mythos-5-1` after a `claude -p --model claude-mythos-5-1 --output-format json` call whose `modelUsage` names only `claude-mythos-5-1`.
No code SHALL ask the CVP question or write `availableModels`.

#### Scenario: Roster in the snippet

- **WHEN** a test reads the snippet
- **THEN** `availableModels` lists no `claude-haiku-4-5`

### Requirement: Schema reference

The snippet SHALL name the generated dotclaude schema as `$schema`.

#### Scenario: Template validates

- **WHEN** the schema check validates the plugin `settings.json` and the snippet against the generated schema
- **THEN** each key is known and each value has the right type

### Requirement: Subagent cache lifetime

The snippet SHALL leave `subagentPromptCacheTtl` unset, which gives 5 minutes.
The reason is the measure of 2026-10-05 (`wiki/Design.md`): 21,765 of 21,807 request gaps of subagents were under 5 minutes.

#### Scenario: Snippet value

- **WHEN** a test reads the snippet
- **THEN** it has no `subagentPromptCacheTtl` key and no `CLAUDE_CODE_SUBAGENT_PROMPT_CACHE_TTL` entry

#### Scenario: Cost of 1 hour

- **WHEN** the 1-hour cache is costed at the documented write prices for the measure of 2026-10-05
- **THEN** it costs about $171 a week more

### Requirement: No 1-hour cache offer

The eval of 2026-10-08 showed no saving from `"1h"`, so no gated item offers it.
The snippet SHALL NOT set `CLAUDE_CODE_SUBAGENT_PROMPT_CACHE_TTL`, because the setting is the documented route and the variable overrides it.

#### Scenario: Gated items

- **WHEN** a test reads the gated items of the snippet
- **THEN** none sets `subagentPromptCacheTtl` to `"1h"`
