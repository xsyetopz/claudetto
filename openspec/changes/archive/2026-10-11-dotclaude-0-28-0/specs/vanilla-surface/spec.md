# Spec Delta

## Purpose

Defines which parts of a vanilla Claude Code install dotclaude turns off, which keys it never sets, that dotclaude writes no managed file, and that dotclaude uses no proprietary format (design D35).

## ADDED Requirements

### Requirement: Built-in plugins off

The settings snippet of the wiki SHALL set `enabledPlugins` entries that turn off each built-in `cc-plugin-*` plugin of the supported Claude Code version, except `cc-plugin-plugin-authoring` and `cc-plugin-sec-default`.
A new built-in plugin that the supported version does not list SHALL stay as Claude Code sets it.
The skill of `cc-plugin-plugin-authoring` SHALL be `name-only` in `skillOverrides`.

#### Scenario: Profile applied

- **WHEN** the user applies the settings snippet
- **THEN** `/plugin` shows `cc-plugin-agents-md`, `cc-plugin-diff`, `cc-plugin-telemetry`, `cc-plugin-tips`, and `cc-plugin-you-should-know` as disabled
- **AND** it shows `cc-plugin-plugin-authoring` as enabled

### Requirement: Forced-off parts

The settings snippet SHALL turn off each built-in part that a settings key or an env var can turn off, when the research shows no quality cost.
The wiki SHALL list each such part with its key, scope, and reason.
A part that might cost quality SHALL stay on until an eval shows no loss.

#### Scenario: Eval-gated part

- **WHEN** the snippet denies `EnterPlanMode`, `ExitPlanMode`, or the Task tools
- **THEN** the wiki gives the date and the figures of an eval run that passes the gating rule of the eval suite

#### Scenario: Failed eval-gated part

- **WHEN** an eval-gated item fails the gating rule, such as `telemetry` or `nonessential-traffic`
- **THEN** the snippet does not set it, and the wiki records the figures of the failed run

### Requirement: Never-set list

The snippet and the plugin `settings.json` SHALL NOT set a key that stops hooks or plugins, removes project instructions or attachments, or forces a model or effort.

#### Scenario: Profile keys

- **WHEN** a test reads the plugin `settings.json` and the snippet of the wiki
- **THEN** they set no key of the never-set list
- **AND** the test fails and names the key if one is set

### Requirement: Never-set list location

The never-set list SHALL be a constant in the pin test and SHALL NOT be a file in `lib/`, because `lib/` ships to users.

#### Scenario: No list in lib

- **WHEN** a test lists the files in `lib/`
- **THEN** none holds the never-set list

### Requirement: Never-set list content

The never-set list SHALL include the keys that stop hooks or plugins, remove project instructions or attachments, or force a model or effort.
The list SHALL also include the other keys of the never-set list in the wiki.

#### Scenario: Listed keys

- **WHEN** a test reads the never-set list
- **THEN** it includes `disableAllHooks`, `allowManagedHooksOnly`, `strictPluginOnlyCustomization`, `disableSideloadFlags`, `CLAUDE_CODE_SIMPLE`, and `CLAUDE_CODE_SAFE_MODE`
- **AND** it includes `CLAUDE_CODE_ENABLE_TASKS=0`, `CLAUDE_CODE_DISABLE_CLAUDE_MDS`, `CLAUDE_CODE_DISABLE_ATTACHMENTS`, and `CLAUDE_CODE_EFFORT_LEVEL`
- **AND** it includes `CLAUDE_CODE_SUBAGENT_MODEL_FORCE`, `MAX_THINKING_TOKENS`, `alwaysThinkingEnabled`, and `CLAUDE_CODE_REMOVE_PROMPT_STRINGS`

### Requirement: No managed file, guard not seated

dotclaude SHALL NOT write `managed-settings.json` or a `managed-settings.d/` drop-in, and SHALL NOT run `sudo`.
dotclaude SHALL run at tier `user` from `settings.json`, with the guard not seated on a machine that has no managed settings.
The wiki SHALL state the deny-override trade-off.

#### Scenario: Deny-override trade-off

- **WHEN** no managed settings exist and an installed mod has a `tool.check` hook that approves a call
- **THEN** that mod can turn a deny rule into an allow, and the user accepted this
- **AND** the wiki documents it, and the guard of dotclaude never weakens a deny

#### Scenario: Machine with managed settings

- **WHEN** the machine has managed settings and the guard is seated
- **THEN** the `SessionStart` drift check reports that the guard is seated and which dotclaude parts it skips
- **AND** dotclaude changes nothing else

#### Scenario: Old managed file

- **WHEN** an old dotclaude managed file exists on the machine
- **THEN** dotclaude does not read, move, or delete it, and prints no `sudo` command
- **AND** the CHANGELOG names the file as one that earlier versions wrote

### Requirement: claude.ai sync off

The snippet SHALL set `syncClaudeAiSkills` to `false` and `syncClaudeAiPlugins` to `false` in a scope that Claude Code reads for these keys.
A project `settings.json` is not such a scope.

#### Scenario: Synced skills do not return

- **WHEN** the snippet is applied and Claude Code runs a claude.ai sync
- **THEN** no `anthropic-skills:*` skill is in the skill listing

### Requirement: claude.ai connectors off

The snippet SHALL set `disableClaudeAiConnectors` to `true`.

#### Scenario: No connector servers

- **WHEN** a session starts with the snippet applied
- **THEN** `/mcp` shows no `claude.ai` server as connected

### Requirement: Built-in MCP servers off

The wiki SHALL give the documented mechanism that turns off the built-in `computer-use` MCP server, or SHALL state that no such mechanism exists.

#### Scenario: Computer use off

- **WHEN** the user applies the mechanism on a platform that has the server
- **THEN** a new session has no `computer-use` tools

### Requirement: No binary change

dotclaude SHALL NOT change the Claude Code binary, its npm package, or files that Claude Code ships.
dotclaude SHALL use only settings, env vars, plugins, mod events, classic hooks, output styles, and CLI flags.
Reading the bundle for evidence is allowed.

#### Scenario: Install check

- **WHEN** a test lists the files that dotclaude code writes
- **THEN** no path is in the Claude Code install folder

### Requirement: No proprietary format

dotclaude 0.28 and later SHALL NOT use or make up a proprietary schema or format for itself.
dotclaude SHALL take only what the latest vanilla Claude Code provides:
settings, env vars, key-values, hooks and the other documented extension points, the API, and possibly the Agent SDK.
A feature that needs its own state file SHALL NOT be built.

#### Scenario: New feature needs a state file

- **WHEN** a design for a feature needs a file that a later hook call or the status line reads back
- **THEN** the feature is not built, and the design records the cut

### Requirement: Delete earlier formats

A format that earlier work built SHALL be deleted outright with its tests, with no migration, no compatibility shim, and no kept copy.

#### Scenario: Test pins a proprietary file

- **WHEN** a test pins a file or a key that only dotclaude defines
- **THEN** the file and the test are both deleted, and no replacement reads the old file

### Requirement: Kept items

The rule of "No proprietary format" SHALL NOT cover the items that the scenario "Kept items" lists.

#### Scenario: Kept items

- **WHEN** an item is a format that Claude Code owns (including the suite format of `claude plugin eval`), or a schema that `tools/schema.mjs` extracts from Claude Code 2.1.295 and later
- **THEN** the rule does not cover it
- **AND** the rule does not cover read-only reads of Claude Code data that the wiki documents with no user detail, or code constants in `limits.mjs`, `lib/budget.mjs`, and `tools/limits.mjs`
- **AND** the rule does not cover prompt text and its XML-like tags, the frontmatter of agents, skills, and output styles, OpenSpec files, and `.env`

#### Scenario: Extracted schema

- **WHEN** a test reads `schemas/claude-code-settings.json`
- **THEN** the file names its Claude Code version in a `$comment` keyword and has no `x-claude-code-version` key

#### Scenario: Undocumented Claude Code data

- **WHEN** the status line reads `cachedUsageUtilization` and the shape is not the known shape
- **THEN** the segment is hidden, and no state file stores the result
