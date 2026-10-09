# Profile keys

This page lists each key and each `env` entry of the settings profile.
The profile sets a key only when the Claude Code default does not give the result that dotclaude needs.
A test fails on a profile key or `env` entry that this page does not list.
The profile file is `plugins/dotclaude/features/setup/profile.json`.

## Environment entries

| Entry | Value | Default | Reason |
| --- | --- | --- | --- |
| `CLAUDE_CODE_ATTRIBUTION_HEADER` | 0 | Unset, a version and fingerprint block starts the system prompt | The block adds tokens and no use. |
| `CLAUDE_CODE_AUTO_COMPACT_WINDOW` | 300000 | The window of the model, 200K for Opus 5.5 | The window that `/context` shows and warns against. |
| `CLAUDE_CODE_AUTO_CONNECT_IDE` | false | Unset, auto-connect to an IDE | The key `autoConnectIde` is in the global config, which setup does not write. |
| `CLAUDE_CODE_DISABLE_ADVISOR_TOOL` | 1 | Unset, the advisor tool can be on | Removes the advisor tool and its instructions. |
| `CLAUDE_CODE_DISABLE_CFC_PROMPT` | 1 | Unset | Removes the Chrome part of the system prompt. |
| `CLAUDE_CODE_DISABLE_CRON` | 1 | Unset, the Cron tools are on | Removes the Cron tools and `/loop`. |
| `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS` | 1 | Unset, the agents `Explore` and `Plan` are on | Each agent adds a line to each request. |
| `CLAUDE_CODE_DISABLE_FAST_MODE` | 1 | Unset, fast mode can be on | Fast mode stays off. |
| `CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY` | 1 | Unset, surveys can show | No survey in a session. |
| `CLAUDE_CODE_DISABLE_TERMINAL_TITLE` | 1 | Unset | No title and no small-model request for a title. |
| `CLAUDE_CODE_FORK_SUBAGENT` | 0 | Unset | A subagent starts with its own prompt and does not fork the main context. |
| `CLAUDE_CODE_IDE_SKIP_AUTO_INSTALL` | 1 | Unset, the IDE extension installs itself | No install without the user. |
| `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` | 5 | Unset, no cap | A hard cap on parallel subagents. |
| `CLAUDE_CODE_MAX_CONTEXT_TOKENS` | 300000 | Unset, the window of the model | The window of a session. It works only with `DISABLE_COMPACT`. |
| `CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT` | 1 | Unset, the long prompt | The forced `dotclaude` output style carries the working rules. |
| `CLAUDE_CODE_SUBAGENT_MODEL` | `claude-sonnet-5-5` | Unset, the main model | A subagent with no model of its own runs on Sonnet 5.5. |
| `CLAUDE_CODE_TODO_REMINDER_MODE` | `off` | Unset, a reminder about the task list every 10 turns | No recurring reminder. |
| `DISABLE_COMPACT` | 1 | Unset, compaction is on | No compaction, and no `/compact`. |
| `DISABLE_ERROR_REPORTING` | 1 | Unset | No error reports. |
| `DISABLE_FEEDBACK_COMMAND` | 1 | Unset | No `/feedback` command. |

The profile has no `CLAUDE_CODE_SUBAGENT_PROMPT_CACHE_TTL`.
The variable overrides the `subagentPromptCacheTtl` setting.
The profile does not set that setting either.
It is an eval-gated item, see [Off switches](Off-Switches).

## Settings keys

| Key | Value | Default | Reason |
| --- | --- | --- | --- |
| `autoCompactEnabled` | false | true | No automatic compaction. |
| `autoMemoryEnabled` | false | true | No auto memory. |
| `includeGitInstructions` | false | true | About 6.2k characters of git text and the git status snapshot leave the prompt. The prompt variants carry the attribution line. The eval of 2026-10-08 showed no loss. |
| `model` | `claude-opus-5-5` | The default of the plan | The main model. |
| `availableModels` | The four models of the roster | Unset, all models | Opus 5.5, Sonnet 5.5, Haiku 5.5, and Fable 5.1. `claude-haiku-4-5` is not in the roster. |
| `enforceAvailableModels` | true | Unset | `Default` resolves to a model of the list. |
| `maxEffortLevel` | `max` | Unset | No cap. The router has its own cap. |
| `enableArtifact` | false | On when the feature is available | Removes the Artifact tool from each request. |
| `enableWorkflows` | false | By plan | Removes the Workflow tool from each request. |
| `promptCacheTtl` | `5m` | Automatic, 1 hour on a subscription within its limits | The cache lifetime of the main conversation is the same on each account. |
| `disableBundledSkills` | true | false | Removes the bundled skills from the listing. |
| `statusLine.refreshInterval` | 1 | Unset, runs only on an event | The warning glyph blinks each second, and the countdowns stay current in an idle session. |
| `statusLine.hideVimModeIndicator` | true | false | The status line shows `vim.mode`, so the built-in `-- INSERT --` indicator would repeat it. |
| `subagentStatusLine` | A command that runs the stub `subagent-statusline.mjs` | Unset, the default rows | One row for each running subagent. |
| `promptSuggestionEnabled` | false | true | No background request for suggestions. |
| `awaySummaryEnabled` | false | true | No background request for a recap. |
| `bashOutputMaxChars` | 4000 | 30000 | The lowest value. A longer `Bash` output goes to a file, and Claude gets a preview and the path. `BASH_OUTPUT_MAX_CHARS` in `lib/budget.mjs` holds the value. |
| `spinnerTipsEnabled` | false | true | No tips in the spinner. |
| `feedbackSurveyRate` | 0 | Unset, a survey can show | No quality survey. |
| `feedbackDrafts` | `off` | `notify` | Removes the `SendFeedback` tool. |
| `fastMode` | false | Off | States the default, because the env entry alone is not read on every surface. |
| `disableAgentView` | true | false | No agent view and no background daemon. |
| `disableRemoteControl` | true | false | No Remote Control. |
| `syncClaudeAiSkills` | false | On when the account has synced skills | No `anthropic-skills:*` skill. User or local settings only. |
| `syncClaudeAiPlugins` | false | On | No plugin sync from claude.ai. User or local settings only. |
| `disableClaudeAiConnectors` | true | false | No claude.ai connector server. |
| `enabledPlugins` | Nine built-in plugins set to false | Each built-in plugin on by its own default | See [Off switches](Off-Switches). |
| `skillOverrides` | `plugin-authoring` and the six `openspec-*` skills are `name-only` | Unset | Shorter listing line. The six names are `openspec-apply-change`, `openspec-archive-change`, `openspec-explore`, `openspec-propose`, `openspec-sync-specs`, and `openspec-update-change`. |
| `attribution` | The commit and PR lines | The Claude Code lines | The attribution that the commit and PR text carries. |
| `sandbox` | On, no unsandboxed commands, a host list | Off | The sandbox limits files and network of Bash. |
| `permissions` | The `deny`, `ask`, and `allow` lists | Unset | Secrets and disk wipes are denied, the plan mode tools and the Task tools are denied, risky commands ask, and read-only commands run. |

## Keys that the profile does not set

- `cleanupPeriodDays`: see [Retention](#retention).
- `enableAllProjectMcpServers`: the profile value `false` equals the default, so 0.28.0 removed it.
- `effortLevel`: each model keeps its default.
- The keys of the never-set list and the eval-gated items: see [Off switches](Off-Switches).
- `managed-settings.json`: dotclaude writes no managed file, see [Off switches](Off-Switches#managed-settings).

## Retention

The profile sets no `cleanupPeriodDays`, so the Claude Code default of 30 days applies.
The 0.27.0 profile wrote 14.
Setup asks before it removes the value 14, and keeps any other value.
A transcript that the value 14 already deleted cannot come back.
To keep transcripts longer, set a larger value in your own settings, such as 400.
To keep none, start Claude Code with `--no-session-persistence`.

## Issue 41458

Issue #41458 of Claude Code reports that a large `cleanupPeriodDays` value was not honored.
So a transcript can be deleted although the setting asks for a long retention.
Copy each transcript that you need from `~/.claude/projects/` to a safe place.
Setup does not delete a transcript, and does not copy one.

## Migration from 0.27.0

Setup shows the diff of each file, and writes only after you confirm.
It changes these 0.27.0 values:

- `maxEffortLevel` from `xhigh` to `max`.
- `availableModels` loses `claude-haiku-4-5` and gains the roster.
- `env.ANTHROPIC_DEFAULT_HAIKU_MODEL` with the value `claude-haiku-4-5` is removed.
- The `statusLine` entry that runs the dotclaude stub is replaced, and the stub is written again for the new status line script.
  The new entry has `refreshInterval: 1` and `hideVimModeIndicator: true`.
- A `subagentStatusLine` entry that runs a dotclaude stub is replaced, and setup writes the stub `subagent-statusline.mjs`.
  An entry of another tool stays, and `--status-line` replaces it.
- `cleanupPeriodDays: 14` is removed only after you answer yes.

Setup keeps each other key of your files.
It copies each file before it writes, and keeps the newest 3 copies.
In project scope, a key that Claude Code ignores in project settings goes to local settings, and setup tells you where it went.
