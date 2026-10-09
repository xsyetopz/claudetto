# vanilla-surface Specification

## Purpose

Defines which parts of a vanilla Claude Code install dotclaude turns off, which keys it never sets, and that dotclaude writes no managed file.

## Requirements

### Requirement: Built-in plugins off

The profile SHALL write `enabledPlugins` entries that turn off each built-in `cc-plugin-*` plugin of the supported Claude Code version, except `cc-plugin-plugin-authoring` and `cc-plugin-sec-default`.
A new built-in plugin that the supported version does not list SHALL stay as Claude Code sets it.
The skill of `cc-plugin-plugin-authoring` SHALL be `name-only` in `skillOverrides`.

#### Scenario: Profile applied

- **WHEN** the user applies the profile with setup
- **THEN** `/plugin` shows `cc-plugin-agents-md`, `cc-plugin-diff`, `cc-plugin-telemetry`, `cc-plugin-tips`, and `cc-plugin-you-should-know` as disabled
- **AND** it shows `cc-plugin-plugin-authoring` as enabled

### Requirement: Forced-off parts

The profile SHALL turn off each built-in part that a settings key or an env var can turn off, when the research shows no quality cost.
The wiki SHALL list each such part with its key, scope, and reason.
A part that might cost quality SHALL stay on until an eval shows no loss.

#### Scenario: Eval-gated part

- **WHEN** the profile denies `EnterPlanMode`, `ExitPlanMode`, or the Task tools
- **THEN** the wiki gives the date and the figures of an eval run that passes the gating rule of the eval suite

#### Scenario: Failed eval-gated part

- **WHEN** an eval-gated item fails the gating rule, such as `telemetry` or `nonessential-traffic`
- **THEN** the profile does not set it, and setup offers it with `--with`

### Requirement: Never-set list

The profile SHALL NOT set a key that stops hooks or plugins, removes project instructions or attachments, or forces a model or effort.
The list SHALL include `disableAllHooks`, `allowManagedHooksOnly`, `strictPluginOnlyCustomization`, `disableSideloadFlags`, `CLAUDE_CODE_SIMPLE`, `CLAUDE_CODE_SAFE_MODE`, `CLAUDE_CODE_ENABLE_TASKS=0`, `CLAUDE_CODE_DISABLE_CLAUDE_MDS`, `CLAUDE_CODE_DISABLE_ATTACHMENTS`, `CLAUDE_CODE_EFFORT_LEVEL`, `CLAUDE_CODE_SUBAGENT_MODEL_FORCE`, `MAX_THINKING_TOKENS`, `alwaysThinkingEnabled`, and `CLAUDE_CODE_REMOVE_PROMPT_STRINGS`.
The list SHALL also include the other keys of the never-set list in the wiki.

#### Scenario: Profile keys

- **WHEN** a test reads the profile
- **THEN** it sets no key of the never-set list
- **AND** the test fails and names the key if one is set

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

- **WHEN** setup finds an old dotclaude managed file
- **THEN** it offers to move its keys into user settings, and prints the `sudo rm` command for the user

### Requirement: claude.ai sync off

The profile SHALL set `syncClaudeAiSkills` to `false` and `syncClaudeAiPlugins` to `false` in a scope that Claude Code reads for these keys.
A project `settings.json` is not such a scope.

#### Scenario: Synced skills do not return

- **WHEN** the profile is applied and Claude Code runs a claude.ai sync
- **THEN** no `anthropic-skills:*` skill is in the skill listing

### Requirement: claude.ai connectors off

The profile SHALL set `disableClaudeAiConnectors` to `true`.

#### Scenario: No connector servers

- **WHEN** a session starts with the profile
- **THEN** `/mcp` shows no `claude.ai` server as connected

### Requirement: Built-in MCP servers off

Setup SHALL turn off the built-in `computer-use` MCP server by the documented mechanism that Claude Code reads, or report that no such mechanism exists.

#### Scenario: Computer use off

- **WHEN** setup applies the profile on a platform that has the server
- **THEN** a new session has no `computer-use` tools

### Requirement: No binary change

dotclaude SHALL NOT change the Claude Code binary, its npm package, or files that Claude Code ships.
dotclaude SHALL use only settings, env vars, plugins, mod events, classic hooks, output styles, and CLI flags.
Reading the bundle for evidence is allowed.

#### Scenario: Install check

- **WHEN** a test lists the files that setup writes
- **THEN** no path is in the Claude Code install folder
