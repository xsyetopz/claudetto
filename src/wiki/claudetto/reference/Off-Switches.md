# Off Switches

An off switch turns off a part of `claudetto` or of Claude Code that you do not need.
Each section below lists the switches of one kind, what they do, and the file that sets them.
Paths start at `plugins/claudetto/` unless they say otherwise.

## Four Ways to Turn Off a Part

| Way | Where you set it |
| --- | --- |
| A plugin option (`userConfig`) | When you enable the plugin |
| A key or `env` entry | The [settings snippet](Settings-Snippet) |
| An `enabledPlugins` entry | For a built-in plugin or a `claudetto` add-on |
| A `skillOverrides` entry | Your settings |

The code reads no `CLAUDETTO_` env var as a switch.
The key names match `schemas/claude-code-settings.json`.

## Plugin Options

| Option | Values | Effect | Read in |
| --- | --- | --- | --- |
| `classifier` | `haiku` (default), `off` | `off` leaves each `ask` of the gate that Jev is not sure about to a person, with no model call. It also skips the model step of the [Reply](Reply) check of the opening of a reply. | `plugins/claudetto/modules/gate/adapters/classifier.ts`, `plugins/claudetto/modules/work/reply/adapters/mod.ts` |
| `compaction` | `auto` (default), `handover`, `built-in` | `built-in` starts no handover and leaves compaction to Claude Code. | `plugins/claudetto/modules/session/handoff/adapters/mod.ts` |
| `decide` | `off`, `jev` (default) | `off` sends no question to Jev. `jev` needs `TYPESAFE_API_KEY`, and then Jev answers each `AskUserQuestion` call that it is sure about. | `plugins/claudetto/modules/jev/adapters/mod.ts` |

The `prompt` slice also reads the env var `DISABLE_COMPACT`.
When it is on, the `prompt` slice gives the context section the text for no compaction.

## Env Entries of the Snippet

Claude Code reads each entry in this table.
The snippet sets other `env` entries that set a value and turn off nothing, such as `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` and `CLAUDE_CODE_PROMPT_CACHE_TTL`.
[Settings Snippet Keys](Settings-Snippet-Keys) gives each entry.

| Entry | Effect |
| --- | --- |
| `CLAUDE_CODE_AUTO_CONNECT_IDE` set to `false` | No connection to an IDE at start. |
| `CLAUDE_CODE_BASH_OUTPUT_AUDIENCE_NOTE` set to `0` | No note on a `Bash` result. |
| `CLAUDE_CODE_DISABLE_ADVISOR_TOOL` set to `1` | No built-in advisor. |
| `CLAUDE_CODE_DISABLE_CFC_PROMPT` set to `1` | No Chrome prompt section. |
| `CLAUDE_CODE_DISABLE_CRON` set to `1` | Removes the cron tools and `/loop`. |
| `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS` set to `1` | No `Explore` and `Plan` agents. |
| `CLAUDE_CODE_DISABLE_FAST_MODE` set to `1` | Removes fast mode. |
| `CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY` set to `1` | No feedback survey. |
| `CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS` set to `1` | No git text, git status block, or attribution reminder. |
| `CLAUDE_CODE_DISABLE_TERMINAL_TITLE` set to `1` | No change of the terminal title. |
| `CLAUDE_CODE_FORK_SUBAGENT` set to `0` | No fork mode. |
| `CLAUDE_CODE_IDE_SKIP_AUTO_INSTALL` set to `1` | No install of the IDE extension. |
| `CLAUDE_CODE_SILENT_TURN_REMINDER` set to `0` | No nudge after a quiet turn. |
| `CLAUDE_CODE_TODO_REMINDER_MODE` set to `off` | No todo reminder. |
| `CLAUDE_CODE_TOTAL_TOKENS_REMINDER` set to `off` | No `total_tokens` reminder. |
| `DISABLE_ERROR_REPORTING` set to `1` | No error report. |
| `DISABLE_EXTRA_USAGE_COMMAND` set to `1` | No `/extra-usage` command. |
| `DISABLE_FEEDBACK_COMMAND` set to `1` | No `/feedback` command. |
| `DISABLE_INSTALL_GITHUB_APP_COMMAND` set to `1` | No `/install-github-app` command. |

All are set in `plugins/claudetto/modules/setup/prompts.ts`.

## Settings Keys of the Snippet

| Key | Effect |
| --- | --- |
| `enableArtifact` set to `false` | No artifacts. |
| `enableWorkflows` set to `false` | No workflows. |
| `promptSuggestionEnabled` set to `false` | No prompt suggestions. |
| `awaySummaryEnabled` set to `false` | No summary after a break. |
| `spinnerTipsEnabled` set to `false` | No spinner tips. |
| `feedbackDrafts` set to `"off"` | Removes the `SendFeedback` tool. |
| `disableRemoteControl` set to `true` | No remote control. |
| `disableBundledSkills` set to `true` | No bundled skills. |
| `autoMemoryEnabled` set to `false` | No auto memory. |
| `autoDreamEnabled` set to `false` | No memory consolidation. |
| `modelProposedGoals` set to `disabled` | The model proposes no goal. |
| `disableClaudeAiConnectors` set to `true` | No claude.ai connectors. |
| `permissions.disableAutoMode` set to `"disable"` | No auto mode. |
| `useAutoModeDuringPlan` set to `false` | No switch to auto mode in the plan mode. |

All are set in `plugins/claudetto/modules/setup/prompts.ts`.
The keys `autoCompactWindow`, `modelSettings`, and `worktree` set a value and turn off nothing.
The `prompt` slice also hides tools and attachments with hooks, not with a switch.
See [Prompt](Prompt).

## Denied Tools and Agents

The `permissions.deny` list of `plugins/claudetto/modules/setup/prompts.ts` removes these tools and agents from the model.

| Entry | Effect |
| --- | --- |
| `Agent(general-purpose)`, `Agent(Explore)`, `Agent(Plan)`, `Agent(claude)`, `Agent(claude-code-guide)`, `Agent(statusline-setup)`, and `Agent(fork)` | No such subagent. The roster of the plugin takes their place ([Agents](Agents)). |
| `mcp__computer-use` | Denies the `computer-use` MCP server. It is a guard for the case that you enable the server. |
| `EnterPlanMode` and `ExitPlanMode` | No plan mode tools. |
| `TaskCreate`, `TaskGet`, `TaskList`, and `TaskUpdate` | No task tools. |
| `Workflow`, `Artifact`, `DesignSync`, and `RemoteTrigger` | No such tool. |
| `ScheduleWakeup` and `ReportFindings` | No such tool. No `claudetto` code uses either tool. |

The other `permissions.deny` entries are safety rules, not switches.

## Built-In Plugins

The snippet sets these entries of `enabledPlugins` to `false`:

- `cc-plugin-agents-md@builtin`
- `cc-plugin-claude-test@builtin`
- `cc-plugin-diff@builtin`
- `cc-plugin-easel@builtin`
- `cc-plugin-mermaid@builtin`
- `cc-plugin-mods-guide@builtin`
- `cc-plugin-plugin-authoring@builtin`
- `cc-plugin-responsive-mode@builtin`
- `cc-plugin-telemetry@builtin`
- `cc-plugin-tips@builtin`
- `cc-plugin-you-should-know@builtin`, because it makes its own model calls when it is on (design D2 of `release-0-3-0-alpha-2`)

The list is in `plugins/claudetto/modules/setup/prompts.ts`.
Claude Code runs it only when its feature flag `tengu_jolly_dewdrop` is on.

## Add-Ons and the Core Plugin

To turn off a `claudetto` add-on, disable it with `/plugin`, or set `enabledPlugins` for `<name>@claudetto` to `false` in user settings.
Claude Code stops loading the parts of a disabled plugin.

## `skillOverrides`

The snippet sets one entry of `skillOverrides`: `plugin-authoring` set to `name-only`.
The value `name-only` shows the skill by name only.
To check the effect, run `/context` in `just sandbox`.

## Never Set

The snippet never sets some keys and env entries, such as `disableAllHooks` and `CLAUDE_CODE_EFFORT_LEVEL`, because each one forces a behavior on every session.
[Never-Set Settings](Off-Switches-Never-Set) lists them.

## Related Pages

- [Never-Set Settings](Off-Switches-Never-Set)
- [Settings Snippet](Settings-Snippet)
- [Settings Snippet Keys](Settings-Snippet-Keys)
- [Setup](Setup)
