# Off Switches

This page tells maintainers and users which switches disable a part of claudetto or of Claude Code.
It lists each switch that disables a part of claudetto or of Claude Code that claudetto relies on.
For each switch, it gives the effect and the code that sets or reads it.
Paths start at `src/plugins/claudetto/` unless they say otherwise.

There are four ways to disable a part:

- A `CLAUDETTO_` variable.
  The code reads none, so there are none.
- A key or an `env` entry of the [settings snippet](Settings-Snippet).
- An `enabledPlugins` entry for a built-in plugin or a claudetto add-on.
- A `skillOverrides` entry.

The snippet is the merge of the `settings` objects of the slices.
The `settings` command of `claudetto-setup` merges it into a settings file with `--apply`.
Without `--apply`, the command prints the changes and writes nothing.

The Claude Code facts refer to version `2.1.296`, which is `TESTED_VERSION` in `slices/setup/domain/facts.ts`.
The key names match `schemas/claude-code-settings.json`.
An effect that comes from the name of a key, and not from a test, is marked `from the name`.
An effect that comes from the research on 2.1.293 is marked `not re-checked`.

## CLAUDETTO Variables

The code reads no `CLAUDETTO_` variable.
`CLAUDETTO_DIR` in `src/kernel/paths.ts` is the name of the `.claudetto` folder, not an env var.
So no `CLAUDETTO_` variable disables a part of claudetto.

## Env Entries of the Snippet

Claude Code reads each entry in this table.
claudetto reads `DISABLE_COMPACT` in `slices/prompt/adapters/mod.ts`, but the snippet does not set it.
It also reads `CLAUDE_CODE_EFFORT_LEVEL` and `CLAUDE_CODE_SUBAGENT_MODEL_FORCE`, which the snippet never sets.
The drift check in `slices/setup/domain/drift.ts` compares every entry of the snippet with the settings file.

| Entry | Effect | Set in |
| --- | --- | --- |
| `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` set to `80.3571` | Starts automatic compaction at 225000 tokens of a 300000 window, the trigger of the auto handoff. | `slices/handoff/slice.ts` |
| `CLAUDE_CODE_AUTO_CONNECT_IDE` set to `false` | No connection to an IDE at start. | `slices/prompt/slice.ts` |
| `CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY` set to `1` | No feedback survey. | `slices/prompt/slice.ts` |
| `CLAUDE_CODE_DISABLE_TERMINAL_TITLE` set to `1` | No change of the terminal title. | `slices/prompt/slice.ts` |
| `CLAUDE_CODE_FORK_SUBAGENT` set to `0` | No forked subagents (from the name). | `slices/prompt/slice.ts` |
| `CLAUDE_CODE_IDE_SKIP_AUTO_INSTALL` set to `1` | No install of the IDE extension. | `slices/prompt/slice.ts` |
| `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` set to `2` | At most two subagents run in parallel (the Pro value, and setup picks `4` or `7` for a Max account). | `slices/prompt/slice.ts` |
| `CLAUDE_CODE_SUBAGENT_MODEL` set to `claude-sonnet-5-5` | A subagent with no model of its own runs on Sonnet 5.5. It is not an off switch. | `slices/prompt/slice.ts` |
| `DISABLE_ERROR_REPORTING` set to `1` | No error report. | `slices/prompt/slice.ts` |
| `DISABLE_FEEDBACK_COMMAND` set to `1` | No `/feedback` command. | `slices/prompt/slice.ts` |
| `CLAUDE_CODE_DISABLE_CRON` set to `1` | Removes the cron tools and `/loop`. | `slices/trim/slice.ts` |
| `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS` set to `1` | Removes the Explore and Plan agents. | `slices/trim/slice.ts` |
| `CLAUDE_CODE_DISABLE_FAST_MODE` set to `1` | Removes fast mode. | `slices/trim/slice.ts` |

The reasons for the `trim` entries are in `slices/trim/domain/removed.ts`.
The snippet does not set `CLAUDE_CODE_DISABLE_CFC_PROMPT`.
Claude in Chrome is off until the user turns it on, and then the switch removes the guidance that its tools need.
See [Trim](Trim).

## Settings Keys of the Snippet

Claude Code reads each key in this table.
The drift check reads each key as described in [Env entries of the snippet](#env-entries-of-the-snippet).

| Key | Effect | Set in |
| --- | --- | --- |
| `enableArtifact` set to `false` | No artifacts. | `slices/prompt/slice.ts` |
| `enableWorkflows` set to `false` | No workflows. | `slices/prompt/slice.ts` |
| `promptSuggestionEnabled` set to `false` | No prompt suggestions. | `slices/prompt/slice.ts` |
| `awaySummaryEnabled` set to `false` | No summary after a break (from the name). | `slices/prompt/slice.ts` |
| `spinnerTipsEnabled` set to `false` | No spinner tips. | `slices/prompt/slice.ts` |
| `feedbackSurveyRate` set to `0` | No feedback survey. | `slices/prompt/slice.ts` |
| `feedbackDrafts` set to `"off"` | Removes the `SendFeedback` tool. | `slices/prompt/slice.ts` |
| `disableRemoteControl` set to `true` | No remote control. | `slices/prompt/slice.ts` |
| `disableBundledSkills` set to `true` | No bundled skills. | `slices/prompt/slice.ts` |
| `autoCompactWindow` set to `300000` | Sets the auto-compact window. It is not an off switch. | `slices/handoff/slice.ts` |
| `modelSettings` with `claude-haiku-5-5` set to an `autoCompactWindow` of `144444` | A shorter window for Haiku. It is not an off switch. | `slices/handoff/slice.ts` |
| `worktree` with `baseRef` set to `head` | A worktree starts from `HEAD`. It is not an off switch. | `slices/setup/slice.ts` |
| `sandbox` with `enabled` set to `true` | Limits the files and the network of `Bash`. It is not an off switch. The list of domains is in `slices/prompt/slice.ts`, and `filesystem.allowWrite` is in `slices/setup/slice.ts`. | `slices/prompt/slice.ts` |
| `autoMemoryEnabled` set to `false` | No auto memory. | `slices/trim/slice.ts` |
| `includeGitInstructions` set to `false` | No git instructions in the prompt. | `slices/trim/slice.ts` |
| `disableClaudeAiConnectors` set to `true` | No claude.ai connectors. | `slices/trim/slice.ts` |
| `syncClaudeAiSkills` set to `false` | No skills synced from claude.ai. | `slices/trim/slice.ts` |
| `syncClaudeAiPlugins` set to `false` | No plugins synced from claude.ai. | `slices/trim/slice.ts` |

The reasons for the `trim` switches are in `slices/trim/domain/removed.ts`.
The `slice.ts` of the `trim` slice builds its settings from that list.
The snippet does not set `disableAgentView` or `fastMode`, and it has no switch for the mode note of `WebSearch`.
See [Trim](Trim).

## Denied Tools and Agents

The `permissions.deny` list of `slices/prompt/slice.ts` removes these tools and agents from the model.

| Entry | Effect |
| --- | --- |
| `Agent(general-purpose)` | No general-purpose subagent. |
| `Agent(claude-code-guide)` | No claude-code-guide agent. |
| `Agent(statusline-setup)` | No statusline-setup agent. |
| `mcp__computer-use` | Denies the `computer-use` MCP server. It is a guard for the case that you enable the server. |
| `EnterPlanMode` and `ExitPlanMode` | No plan mode tools. |
| `TaskCreate`, `TaskGet`, `TaskList`, `TaskStop`, and `TaskUpdate` | No task tools. |
| `ScheduleWakeup` and `ReportFindings` | No such tool. No claudetto code uses either tool, and the vanilla request sends both with their full schema ([Tools and deferral](Tools-And-Deferral)). |

The other `permissions.deny` and `permissions.ask` entries are safety rules, not switches.

## Built-In Agents

The snippet disables the built-in agents `Explore` and `Plan` with `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS`.
It disables `general-purpose`, `claude-code-guide`, and `statusline-setup` with one `permissions.deny` entry each.
The six claudetto agents take the work of the built-in agents, see [Agents](Agents).

## Computer Use

The `computer-use` MCP server is opt-in in Claude Code.
The research on 2.1.293 found that Claude Code starts it only when the project key `enabledMcpServers` holds `computer-use` (not re-checked on 2.1.296).
The deny entry `mcp__computer-use` is a guard for the case that you enable the server.

## Built-In Plugins

The snippet sets these entries of `enabledPlugins` to `false`:

- `cc-plugin-agents-md@builtin`
- `cc-plugin-claude-test@builtin`
- `cc-plugin-diff@builtin`
- `cc-plugin-mermaid@builtin`
- `cc-plugin-mods-guide@builtin`
- `cc-plugin-responsive-mode@builtin`
- `cc-plugin-telemetry@builtin`
- `cc-plugin-tips@builtin`
- `cc-plugin-you-should-know@builtin`

`OFF_PLUGINS` in `slices/setup/domain/facts.ts` holds this list.
`pluginsOn` in `slices/setup/domain/drift.ts` reports each plugin of the list that the settings still enable.
`cc-plugin-plugin-authoring@builtin` is not in the list, so the snippet leaves it enabled.

## Add-Ons and the Core Plugin

To disable a claudetto add-on, disable it with `/plugin`, or set `enabledPlugins` for `<name>@claudetto` to `false` in user settings.
The add-on step of `setup` reads that entry in `installedAddons` (`slices/setup/domain/addons.ts`).
It skips each add-on whose entry is `false`, so it plans no tools for that add-on.
Claude Code stops loading the parts of a disabled plugin (Claude Code behavior, not re-checked on 2.1.296).

The core plugin `claudetto` is not in that list, so the `setup` step reads no entry for it.

## `skillOverrides`

The snippet sets one entry of `skillOverrides`: `plugin-authoring` set to `name-only`.
It is in `slices/prompt/slice.ts`.
The value `name-only` shows the skill by name only (from the name).
The research on 2.1.293 found that Claude Code skips `skillOverrides` for a plugin skill, so this entry may have no effect.
This is not re-checked on 2.1.296.
See [Decisions-Settings](Decisions-Settings), decision D5.
To check the effect, run `/context` in `just sandbox`.

## Managed Settings

No code in `src/plugins/claudetto/` writes a managed settings file.
Without managed settings, the guard `cc-plugin-sec-default` is not seated, and claudetto runs at tier `user`.
An installed mod with a `tool.check` hook can then change a content deny rule into an allow (research on 2.1.293).
A path deny and a whole-tool deny stay enforced.
See [Decisions-Settings](Decisions-Settings), decision D14.

## Not in the Snippet

The snippet sets none of the items that might cost quality, and no code reads them.
The reasons and the eval are in [Decisions-Settings](Decisions-Settings) and [Evals](Evals).
Set one by hand in your own settings at your own risk.

## Never Set

The snippet never sets these entries.
The lists are in `tests/support/settings-pin.ts`, as `NEVER_SET_KEYS` and `NEVER_SET_ENV`.
The tests `tests/claudetto/settings-pin.test.ts` and `tests/claudetto/trim/settings.test.ts` check the snippet against them.

| Entry | Value | Reason |
| --- | --- | --- |
| `disableAllHooks` | any | Stops all hooks. |
| `allowManagedHooksOnly` | any | Stops the hooks of plugins. |
| `strictPluginOnlyCustomization` | any | Stops customization by the user. |
| `disableSideloadFlags` | any | Stops the flags that load a plugin folder. |
| `alwaysThinkingEnabled` | any | Forces thinking on every model. |
| `allowAllClaudeAiMcps` | any | Turns on every claude.ai connector. |
| `claudeMd` | any | Replaces the project instructions. |
| `CLAUDE_CODE_SIMPLE` | any | Turns off hooks, plugins, skills, and memory. |
| `CLAUDE_CODE_SAFE_MODE` | any | Turns off hooks, plugins, skills, and memory. |
| `CLAUDE_CODE_ENABLE_TASKS` | `0` | Removes the task tools that the model uses. |
| `CLAUDE_CODE_DISABLE_CLAUDE_MDS` | any | Removes the project instructions. |
| `CLAUDE_CODE_DISABLE_ATTACHMENTS` | any | Removes the attachments. |
| `CLAUDE_CODE_EFFORT_LEVEL` | any | Forces one effort on every model. |
| `CLAUDE_CODE_SUBAGENT_MODEL_FORCE` | any | Forces the model of a subagent. |
| `MAX_THINKING_TOKENS` | any | Forces a thinking budget. |
| `CLAUDE_CODE_DISABLE_WEB_FETCH` | any | Removes the web fetch tool. |
| `CLAUDE_CODE_BASH_EDIT_DIFF` | `0` | Removes the edit diff of Bash. |
| `CLAUDE_CODE_SKIP_PLUGIN_MCP_SERVERS` | any | Drops the MCP servers of plugins. |
| `CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS` | any | Removes beta features. |
| `DISABLE_INTERLEAVED_THINKING` | any | Removes thinking between tool calls. |

## Related Pages

- [Settings Schema](Settings-Schema)
- [Settings Snippet Keys](Settings-Snippet-Keys)
- [Trim](Trim)
