# Settings snippet keys

This page gives the reason, the scope, and the Claude Code default of each key and `env` entry of the [Settings snippet](Settings-Snippet).
The snippet sets a key only when the Claude Code default does not give the result that dotclaude needs.
A test checks the keys of the snippet against `schemas/claude-code-settings.json`, so a key that the schema lacks fails the test.

A scope of "Any" means that Claude Code reads the key from user, project, and local settings.
A scope of "User" means that Claude Code reads the key from user settings and local settings, and ignores it in project settings.
The scope column comes from the descriptions in the schema.

## Environment entries

| Entry | Value | Default | Reason |
| --- | --- | --- | --- |
| `CLAUDE_CODE_ATTRIBUTION_HEADER` | 0 | Unset, a version and fingerprint block starts the system prompt | The block adds tokens and no use. |
| `CLAUDE_CODE_AUTO_COMPACT_WINDOW` | 300000 | The window of the model, 200K for Opus 5.5 | The window that `/context` shows and warns against. |
| `CLAUDE_CODE_AUTO_CONNECT_IDE` | false | Unset, auto-connect to an IDE | The key `autoConnectIde` is in the global config, so the snippet uses the variable. |
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

All env entries have the scope "Any".
The snippet never sets `CLAUDE_CODE_EFFORT_LEVEL`, `CLAUDE_CODE_SUBAGENT_MODEL_FORCE`, or `CLAUDE_CODE_SUBAGENT_PROMPT_CACHE_TTL`.
The first two defeat the `model` and `effort` of the agent files ([Decisions: router and agents](Decisions-Router)).
The third overrides the `subagentPromptCacheTtl` setting, which the snippet does not set either.
See [Off switches](Off-Switches#not-in-the-snippet).

## Settings keys

| Key | Value | Scope | Default | Reason |
| --- | --- | --- | --- | --- |
| `autoCompactEnabled` | false | Any | true | No automatic compaction. |
| `autoMemoryEnabled` | false | Any | true | No auto memory. |
| `includeGitInstructions` | false | Any | true | About 6.2k characters of git text and the git status snapshot leave the prompt. The prompt variants carry the attribution line. |
| `model` | `claude-opus-5-5` | Any | The default of the plan | The main model. |
| `availableModels` | The four models of the roster | Any | Unset, all models | Opus 5.5, Sonnet 5.5, Haiku 5.5, and Fable 5.1. `claude-haiku-4-5` is not in the roster. For a CVP account see [the CVP procedure](#cvp-procedure). |
| `enforceAvailableModels` | true | Any | Unset | `Default` resolves to a model of the list. |
| `maxEffortLevel` | `max` | Any | Unset | No cap. Each model keeps its effort, and dotclaude never rewrites it. |
| `enableArtifact` | false | Any, a project can only turn it off | On when the feature is available | Removes the Artifact tool from each request. |
| `enableWorkflows` | false | Any | By plan | Removes the Workflow tool from each request. |
| `promptCacheTtl` | `5m` | Any | Automatic, 1 hour on a subscription within its limits | The cache lifetime of the main conversation is the same on each account. |
| `disableBundledSkills` | true | Any | false | Removes the bundled skills from the listing. |
| `statusLine` | A command that runs `features/statusline/cli.mjs`, with `refreshInterval` 1 and `hideVimModeIndicator` true | Any | Unset | The three-column status line. `refreshInterval` keeps the countdowns and the blinking glyph current in an idle session. The line shows `vim.mode`, so the built-in `-- INSERT --` indicator would repeat it. See [Status line](Status-Line). |
| `subagentStatusLine` | A command that runs `features/statusline/subagent-cli.mjs` | Any | Unset, the default rows | One row for each running subagent. |
| `promptSuggestionEnabled` | false | Any | true | No background request for suggestions. |
| `awaySummaryEnabled` | false | Any | true | No background request for a recap. |
| `bashOutputMaxChars` | 4000 | Any | 30000 | The lowest value. A longer `Bash` output goes to a file, and Claude gets a preview and the path. `BASH_OUTPUT_MAX_CHARS` in `lib/budget.mjs` holds the value. |
| `spinnerTipsEnabled` | false | Any | true | No tips in the spinner. |
| `feedbackSurveyRate` | 0 | Any | Unset, a survey can show | No quality survey. |
| `feedbackDrafts` | `off` | Any | `notify` | Removes the `SendFeedback` tool. |
| `fastMode` | false | Any | Off | States the default, because the env entry alone is not read on every surface. |
| `disableAgentView` | true | Any | false | No agent view and no background daemon. |
| `disableRemoteControl` | true | Any | false | No Remote Control. |
| `syncClaudeAiSkills` | false | User | On when the account has synced skills | No `anthropic-skills:*` skill. Project settings do not read it. |
| `syncClaudeAiPlugins` | false | User | On | No plugin sync from claude.ai. Project settings do not read it. |
| `disableClaudeAiConnectors` | true | Any, a `true` in any source wins | false | No claude.ai connector server. |
| `enabledPlugins` | Nine built-in plugins set to false | Any | Each built-in plugin on by its own default | See [Off switches](Off-Switches). |
| `skillOverrides` | `plugin-authoring` and the six `openspec-*` skills are `name-only` | Any | Unset | Shorter listing line. The six names are `openspec-apply-change`, `openspec-archive-change`, `openspec-explore`, `openspec-propose`, `openspec-sync-specs`, and `openspec-update-change`. |
| `attribution` | The commit and PR lines | Any | The Claude Code lines | The attribution that the commit and PR text carries. |
| `sandbox` | On, a retry outside the sandbox allowed, a host list | Any | Off | The sandbox limits files and network of `Bash`. `git fetch`, `git pull`, `git push`, and `gh` run outside it, and they still go through the permission flow. |
| `permissions` | `disableBypassPermissionsMode`, and the `deny`, `ask`, and `allow` lists | Any | Unset | Secrets and disk wipes are denied, the plan mode tools and the Task tools are denied, risky commands ask, and read-only commands run. |

The status line entries need the absolute path of the plugin folder, because a status line command gets no `${CLAUDE_PLUGIN_ROOT}`.
dotclaude writes no launcher stub for them.

## Keys that the snippet does not set

- `cleanupPeriodDays`: see [Retention](#retention).
- `enableAllProjectMcpServers`: the value `false` equals the default.
- `effortLevel`: each model keeps its default.
- The keys of the never-set list and the items without a gate: see [Off switches](Off-Switches).
- `managed-settings.json`: dotclaude writes no managed file, see [Off switches](Off-Switches#managed-settings).

## CVP procedure

An account in the Cyber Verification Program (CVP) can call `claude-mythos-5-1` in place of `claude-fable-5-1`.
An answer alone grants nothing, so a probe call must show that Mythos 5.1 serves the account.

1. Run the probe.
   `--settings` allows Mythos 5.1 for this call, whatever your settings hold.

   ```bash
   claude -p "Reply with the one word: ok" \
     --model claude-mythos-5-1 \
     --settings '{"availableModels":["claude-mythos-5-1"]}' \
     --output-format json
   ```

1. Read the output.
   The call is served by Mythos 5.1 only when the exit code is 0 and `modelUsage` has one key, `claude-mythos-5-1`.
1. If so, put `claude-mythos-5-1` in `availableModels` in place of `claude-fable-5-1`.
   If not, keep `claude-fable-5-1`.

A call for a model outside `availableModels` falls back to another model with no error.
So `is_error` is not a test, and `modelUsage` is.
A live probe on 2026-10-08 exited with 0 and the result `ok`, but `modelUsage` named only `claude-opus-5-5`.
That account was not served by Mythos 5.1, so Fable 5.1 stays.

## Retention

The snippet sets no `cleanupPeriodDays`, so the Claude Code default of 30 days applies.
The 0.27.0 setup wrote 14, and 0.28.0 does not remove it.
If your `settings.json` still has 14, change or delete it by hand.
A transcript that the value 14 already deleted cannot come back.
To keep transcripts longer, set a larger value in your own settings, such as 400.
To keep none, start Claude Code with `--no-session-persistence`.

### Issue 41458

Issue #41458 of Claude Code reports that a large `cleanupPeriodDays` value was not honored.
So a transcript can be deleted although the setting asks for a long retention.
Copy each transcript that you need from `~/.claude/projects/` to a safe place.
dotclaude does not delete a transcript, and does not copy one.

## Related pages

- [Settings snippet](Settings-Snippet)
- [Off switches](Off-Switches)
- [Settings schema](Settings-Schema)
