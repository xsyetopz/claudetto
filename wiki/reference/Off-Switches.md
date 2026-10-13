# Off Switches

This page tells maintainers and users which switches disable a part of dotclaude or of Claude Code.
It lists each switch that disables a part of dotclaude or of Claude Code that dotclaude relies on.
For each switch, it gives the effect and the code that sets or reads it.
Paths start at `src/plugins/dotclaude/` unless they say otherwise.

There are four ways to disable a part:

- A `DOTCLAUDE_` variable.
  The code reads none, so there are none.
- A key or an `env` entry of the [settings snippet](Settings-Snippet).
- An `enabledPlugins` entry for a built-in plugin or a dotclaude add-on.
- A `skillOverrides` entry.

The snippet is the merge of the `settings` objects of the slices.
The `settings` command of `dotclaude-setup` merges it into a settings file with `--apply`.
Without `--apply`, the command prints the changes and writes nothing.

The Claude Code facts refer to version `2.1.296`, which is `TESTED_VERSION` in `slices/setup/domain/facts.ts`.
The key names match `schemas/claude-code-settings.json`.
An effect that comes from the name of a key, and not from a test, is marked `from the name`.
An effect that comes from the research on 2.1.293 is marked `not re-checked`.

## DOTCLAUDE Variables

The code reads no `DOTCLAUDE_` variable.
`DOTCLAUDE_DIR` in `src/kernel/paths.ts` is the name of the `.dotclaude` folder, not an env var.
So no `DOTCLAUDE_` variable disables a part of dotclaude.

## Env Entries of the Snippet

Claude Code reads each entry in this table.
dotclaude reads `DISABLE_COMPACT`, which this table lists.
It also reads three variables that the table does not list: `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS`, `CLAUDE_CODE_EFFORT_LEVEL`, and `CLAUDE_CODE_SUBAGENT_MODEL_FORCE`.
The drift check in `slices/setup/domain/drift.ts` compares every entry of the snippet with the settings file.

| Entry | Effect | Set in |
| --- | --- | --- |
| `CLAUDE_CODE_AUTO_CONNECT_IDE` set to `false` | No connection to an IDE at start. | `slices/prompt/slice.ts` |
| `CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY` set to `1` | No feedback survey. | `slices/prompt/slice.ts` |
| `CLAUDE_CODE_DISABLE_TERMINAL_TITLE` set to `1` | No change of the terminal title. | `slices/prompt/slice.ts` |
| `CLAUDE_CODE_FORK_SUBAGENT` set to `0` | No forked subagents (from the name). | `slices/prompt/slice.ts` |
| `CLAUDE_CODE_IDE_SKIP_AUTO_INSTALL` set to `1` | No install of the IDE extension. | `slices/prompt/slice.ts` |
| `CLAUDE_CODE_TODO_REMINDER_MODE` set to `off` | No recurring task list reminder. | `slices/prompt/slice.ts` |
| `DISABLE_COMPACT` set to `1` | No automatic summary of the context. dotclaude reads it in `slices/prompt/adapters/mod.ts` (`onSection`). The `context_management` section changes only when the entry is set to a value other than `0` or `false`. | `slices/prompt/slice.ts` |
| `DISABLE_ERROR_REPORTING` set to `1` | No error report. | `slices/prompt/slice.ts` |
| `DISABLE_FEEDBACK_COMMAND` set to `1` | No `/feedback` command. | `slices/prompt/slice.ts` |
| `CLAUDE_CODE_DISABLE_CFC_PROMPT` set to `1` | Removes the CFC part of the prompt. | `slices/trim/slice.ts` |
| `CLAUDE_CODE_DISABLE_CRON` set to `1` | Removes the cron tools and `/loop`. | `slices/trim/slice.ts` |
| `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS` set to `1` | Removes the Explore and Plan agents. | `slices/trim/slice.ts` |
| `CLAUDE_CODE_DISABLE_FAST_MODE` set to `1` | Removes fast mode. | `slices/trim/slice.ts` |

The reasons for the `trim` entries are in `slices/trim/domain/removed.ts`.
`CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT` set to `1` is not an off switch.
It replaces the built-in system prompt with the prompt of the `prompt` slice, so it has no row here.

## Settings Keys of the Snippet

Claude Code reads each key in this table.
The drift check reads each key as described in [Env entries of the snippet](#env-entries-of-the-snippet).

| Key | Effect | Set in |
| --- | --- | --- |
| `autoCompactEnabled` set to `false` | No automatic compaction. | `slices/prompt/slice.ts` |
| `enableArtifact` set to `false` | No artifacts. | `slices/prompt/slice.ts` |
| `enableWorkflows` set to `false` | No workflows. | `slices/prompt/slice.ts` |
| `promptSuggestionEnabled` set to `false` | No prompt suggestions. | `slices/prompt/slice.ts` |
| `awaySummaryEnabled` set to `false` | No summary after a break (from the name). | `slices/prompt/slice.ts` |
| `spinnerTipsEnabled` set to `false` | No spinner tips. | `slices/prompt/slice.ts` |
| `feedbackSurveyRate` set to `0` | No feedback survey. | `slices/prompt/slice.ts` |
| `feedbackDrafts` set to `"off"` | Removes the `SendFeedback` tool. | `slices/prompt/slice.ts` |
| `disableRemoteControl` set to `true` | No remote control. | `slices/prompt/slice.ts` |
| `disableBundledSkills` set to `true` | No bundled skills. | `slices/prompt/slice.ts` |
| `autoMemoryEnabled` set to `false` | No auto memory. | `slices/trim/slice.ts` |
| `includeGitInstructions` set to `false` | No git instructions in the prompt. | `slices/trim/slice.ts` |
| `fastMode` set to `false` | No fast mode. | `slices/trim/slice.ts` |
| `disableAgentView` set to `true` | No agent view. | `slices/trim/slice.ts` |
| `disableClaudeAiConnectors` set to `true` | No claude.ai connectors. | `slices/trim/slice.ts` |
| `syncClaudeAiSkills` set to `false` | No skills synced from claude.ai. | `slices/trim/slice.ts` |
| `syncClaudeAiPlugins` set to `false` | No plugins synced from claude.ai. | `slices/trim/slice.ts` |

The reasons for the `trim` switches are in `slices/trim/domain/removed.ts`.
No shipped code imports that list, so the keys above are set in the slice files only.

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
| `ScheduleWakeup` and `ReportFindings` | No such tool. No dotclaude code uses either tool. |

The other `permissions.deny` and `permissions.ask` entries are safety rules, not switches.

## Built-In Agents

The snippet disables the built-in agents `Explore` and `Plan` with `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS`.
It disables `general-purpose`, `claude-code-guide`, and `statusline-setup` with one `permissions.deny` entry each.
The six dotclaude agents take the work of the built-in agents, see [Agents](Agents).

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

To disable a dotclaude add-on, disable it with `/plugin`, or set `enabledPlugins` for `<name>@dotclaude` to `false` in user settings.
The add-on step of `setup` reads that entry in `installedAddons` (`slices/setup/domain/addons.ts`).
It skips each add-on whose entry is `false`, so it plans no tools for that add-on.
Claude Code stops loading the parts of a disabled plugin (Claude Code behavior, not re-checked on 2.1.296).

The core plugin `dotclaude` is not in that list, so the `setup` step reads no entry for it.

## `skillOverrides`

The snippet sets one entry of `skillOverrides`: `plugin-authoring` set to `name-only`.
It is in `slices/prompt/slice.ts`.
The value `name-only` shows the skill by name only (from the name).
The research on 2.1.293 found that Claude Code skips `skillOverrides` for a plugin skill, so this entry may have no effect.
This is not re-checked on 2.1.296.
See [Decisions-Settings](Decisions-Settings), decision D5.
To check the effect, run `/context` in `just sandbox`.

## Managed Settings

No code in `src/plugins/dotclaude/` writes a managed settings file.
Without managed settings, the guard `cc-plugin-sec-default` is not seated, and dotclaude runs at tier `user`.
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
The tests `tests/dotclaude/settings-pin.test.ts` and `tests/dotclaude/trim/settings.test.ts` check the snippet against them.

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
| `CLAUDE_CODE_REMOVE_PROMPT_STRINGS` | any | Removes text of the system prompt. |
| `CLAUDE_CODE_DISABLE_WEB_FETCH` | any | Removes the web fetch tool. |
| `CLAUDE_CODE_BASH_EDIT_DIFF` | `0` | Removes the edit diff of Bash. |
| `CLAUDE_CODE_SKIP_PLUGIN_MCP_SERVERS` | any | Drops the MCP servers of plugins. |
| `CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS` | any | Removes beta features. |
| `DISABLE_INTERLEAVED_THINKING` | any | Removes thinking between tool calls. |

## Related Pages

Read [Settings schema](Settings-Schema) next.
It describes the JSON Schema of the settings keys.
