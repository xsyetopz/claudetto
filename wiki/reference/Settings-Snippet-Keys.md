# Settings snippet keys

This page gives each key and `env` entry of the [Settings snippet](Settings-Snippet).
Each row gives the value, what the key does in Claude Code, and why dotclaude sets it.
The snippet sets a key only when the Claude Code default does not give the result that dotclaude needs.

The snippet merges the `settings` entries of the slices in `src/plugins/dotclaude/slices/`.
The `prompt` slice sets most keys and the `env` entries.
The `trim` slice sets the `env` entries that turn off the built-in parts, and the keys `autoMemoryEnabled` to `syncClaudeAiPlugins`.
The `statusline` slice sets `statusLine` and `subagentStatusLine`.
The `styles` slice sets `outputStyle`.
A test checks the keys of the snippet against `schemas/claude-code-settings.json`, so a key that the schema lacks fails the test.

## Environment entries

| Entry | Value | What it does in Claude Code | Why dotclaude sets it |
| --- | --- | --- | --- |
| `CLAUDE_CODE_ATTRIBUTION_HEADER` | `0` | Default: a version and fingerprint block starts the system prompt. | The block adds tokens and gives dotclaude no use. |
| `CLAUDE_CODE_AUTO_COMPACT_WINDOW` | `300000` | Sets the window that automatic compaction works against. Default: the window of the model. | The window that `/context` shows and warns against. |
| `CLAUDE_CODE_AUTO_CONNECT_IDE` | `false` | Default: the IDE connects by itself. | The global config key `autoConnectIde` is not set by the snippet, so the variable does the work. |
| `CLAUDE_CODE_DISABLE_ADVISOR_TOOL` | `1` | Removes the advisor tool and its instructions. Default: the tool can be on. | Each tool line and its instructions add tokens to each request. |
| `CLAUDE_CODE_DISABLE_CFC_PROMPT` | `1` | Removes the Chrome part of the system prompt. | The part is not used. |
| `CLAUDE_CODE_DISABLE_CRON` | `1` | Removes the Cron tools and `/loop`. Default: on. | No scheduled runs. |
| `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS` | `1` | Removes the built-in agents `Explore` and `Plan`. Default: on. | Each agent adds a line to each request. |
| `CLAUDE_CODE_DISABLE_FAST_MODE` | `1` | Keeps fast mode off. Default: fast mode can be on. | Fast mode stays off. |
| `CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY` | `1` | Stops the session quality survey. Default: the survey can show. | No survey in a session. |
| `CLAUDE_CODE_DISABLE_TERMINAL_TITLE` | `1` | Stops the terminal title and its small-model request. Default: on. | No title and no request for one. |
| `CLAUDE_CODE_FORK_SUBAGENT` | `0` | Default: a subagent forks the main context. | A subagent starts with its own prompt. |
| `CLAUDE_CODE_IDE_SKIP_AUTO_INSTALL` | `1` | Stops the IDE extension from installing itself. Default: it installs. | No install without the user. |
| `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` | `5` | Caps the subagents that run in parallel. Default: no cap. | A hard cap on parallel subagents. |
| `CLAUDE_CODE_MAX_CONTEXT_TOKENS` | `300000` | Sets the context window of a session. Default: the window of the model. | The window that dotclaude sets for a session. |
| `CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT` | `1` | Uses the short system prompt. Default: the long prompt. | The `dotclaude:Concise` style carries the tone and the format, and the hooks module puts the working rules in the system prompt. |
| `CLAUDE_CODE_SUBAGENT_MODEL` | `claude-sonnet-5-5` | Sets the model of a subagent that has no model of its own. Default: the main model. | A subagent with no model of its own runs on Sonnet 5.5. |
| `CLAUDE_CODE_TODO_REMINDER_MODE` | `off` | Default: a recurring reminder about the task list. | No recurring reminder. |
| `DISABLE_COMPACT` | `1` | Turns off compaction and `/compact`. Default: compaction is on. | No compaction. |
| `DISABLE_ERROR_REPORTING` | `1` | Default: error reports are sent. | No error reports. |
| `DISABLE_FEEDBACK_COMMAND` | `1` | Removes the `/feedback` command. Default: the command is there. | No `/feedback` command. |

The snippet never sets `CLAUDE_CODE_EFFORT_LEVEL`, `CLAUDE_CODE_SUBAGENT_MODEL_FORCE`, or `CLAUDE_CODE_SUBAGENT_PROMPT_CACHE_TTL`.
The first two defeat the `model` and `effort` of the agent files ([Decisions: router and agents](Decisions-Router)).
The third overrides the `subagentPromptCacheTtl` setting, which the snippet does not set either.
See [Off switches](Off-Switches#not-in-the-snippet).

## Settings keys

| Key | Value | What it does in Claude Code | Why dotclaude sets it |
| --- | --- | --- | --- |
| `$schema` | The URL of `schemas/claude-code-settings.json` on the main branch | Points an editor at the JSON Schema of the settings. | An editor can check the keys of the file. |
| `outputStyle` | `dotclaude:Concise` | Selects the output style for assistant responses. The style is selected, not forced, so the `outputStyle` of the user can change it. Default: the style of the user. | The `styles` slice ships the concise style. It keeps the coding instructions, because the `prompt` slice changes the coding sections. |
| `model` | `claude-opus-5-5` | Sets the main model. Default: the model of the plan. | The main model. |
| `availableModels` | Fable 5.1, Opus 5.5, Sonnet 5.5, and Haiku 5.5 | Lists the models that the user can select. Default: all models. | `claude-haiku-4-5` is not in the roster. For a CVP account see [the CVP procedure](#cvp-procedure). |
| `enforceAvailableModels` | `true` | When `true`, `Default` resolves to a model of `availableModels`. | `Default` stays on a model of the list. |
| `maxEffortLevel` | `max` | Sets the highest effort level, and anything above it is clamped. Default: unset. | No cap in practice. Each model keeps its effort, and dotclaude never rewrites it. |
| `enableArtifact` | `false` | Turns the Artifact tool off. Project and local settings can only turn it off. Default: on when the feature is available. | Removes the Artifact tool from each request. |
| `enableWorkflows` | `false` | Turns the Workflows feature off. Default: by plan. | Removes the Workflow tool from each request. |
| `promptCacheTtl` | `5m` | Sets the cache lifetime of the main conversation. Default: automatic, 1 hour on a subscription within its limits. | The lifetime is the same on each account. |
| `disableBundledSkills` | `true` | Removes the bundled skills and workflows. Built-in slash commands stay typable. Default: the skills are on. | Removes the bundled skills from the listing. |
| `statusLine` | `type` `command`, the command `bun --no-env-file "<plugin folder>/bin/dotclaude-statusline"`, `padding` `0`, `refreshInterval` `1`, and `hideVimModeIndicator` `true` | Sets the status line command, and hides the built-in vim mode indicator. Default: unset. | The three-column status line. `refreshInterval` keeps the countdowns and the blinking glyph current in an idle session. The line shows `vim.mode`, so the built-in indicator would repeat it. See [Status line](Status-Line). |
| `subagentStatusLine` | The command `bun --no-env-file "<plugin folder>/bin/dotclaude-statusline" --subagent` | Sets the status line of each subagent. Default: the default rows. | One row for each running subagent. |
| `autoCompactEnabled` | `false` | Turns automatic compaction off. Default: on. | No automatic compaction. |
| `autoMemoryEnabled` | `false` | Stops the auto-memory directory of the project from being read or written. Default: on. | No auto memory. |
| `includeGitInstructions` | `false` | Leaves the built-in commit and PR workflow text out of the system prompt. Default: included. | The git text adds tokens to each request, and `attribution` gives the commit line. |
| `promptSuggestionEnabled` | `false` | Turns off prompt suggestions. Default: on. | No background request for suggestions. |
| `awaySummaryEnabled` | `false` | Turns off the session recap that shows after 5 minutes away. Default: on. | No background request for a recap. |
| `bashOutputMaxChars` | `4000` | Sets how many characters of a successful `Bash` output go inline. Output past this goes to a file. Default: `30000`, and values clamp to 4000 to 128000. | The lowest value. The bound `BASH_OUTPUT_MAX_CHARS` in `src/kernel/budget.ts` holds the same value. |
| `spinnerTipsEnabled` | `false` | Hides the tips in the spinner. Default: shown. | No tips. |
| `feedbackSurveyRate` | `0` | Sets the chance that the quality survey shows, from 0 to 1. Default: unset. | No quality survey. |
| `feedbackDrafts` | `off` | Turns off the `SendFeedback` tool. Default: `notify`. | Removes the tool. |
| `fastMode` | `false` | Turns fast mode off. Default: off. | Fast mode stays off, with the env entry `CLAUDE_CODE_DISABLE_FAST_MODE`. |
| `disableAgentView` | `true` | Turns off the agent view, `claude agents`, `--bg`, and the background daemon. Default: `false`. | No agent view and no background daemon. |
| `disableRemoteControl` | `true` | Turns off Remote Control. Default: `false`. | No Remote Control. |
| `syncClaudeAiSkills` | `false` | Stops the sync of the skills that you enable on claude.ai. Read in user or managed settings only. Default: on when the account has synced skills. | No `anthropic-skills:*` skill. |
| `syncClaudeAiPlugins` | `false` | Stops the sync of the plugins that you enable on claude.ai. Read in user or managed settings only. Default: on. | No plugin sync from claude.ai. |
| `disableClaudeAiConnectors` | `true` | Stops the claude.ai MCP connectors from being fetched. A `true` in any settings source wins. Default: `false`. | No claude.ai connector server. |
| `enabledPlugins` | Nine built-in plugins set to `false` | Turns on or off each plugin, by its `plugin-id@marketplace-id`. Default: each plugin on by its own default. | See [Off switches](Off-Switches). |
| `skillOverrides` | `plugin-authoring` set to `name-only` | Asks Claude Code to list the skill by name only, not re-checked on `2.1.296` ([Off switches](Off-Switches#skilloverrides)). Default: unset. | A shorter listing line for `plugin-authoring`. |
| `attribution` | The commit and PR lines | Sets the attribution text of commits and PRs. Default: the Claude Code lines. | The attribution that the commit and PR text carries. |
| `sandbox` | On, a retry outside the sandbox allowed, a list of allowed domains | Limits the files and the network of `Bash`. Default: off. | The sandbox limits `Bash`. `git fetch`, `git pull`, `git push`, and `gh` run outside it, and they still go through the permission flow. |
| `permissions` | `disableBypassPermissionsMode` set to `disable`, and the `deny`, `ask`, and `allow` lists | Sets the rules for each tool call. `deny` blocks, `ask` asks, and `allow` runs without a prompt. Default: unset. | Risky commands ask, and read-only commands run. The `deny` list holds the groups below. |

The `deny` list of the snippet holds these groups.

| Denied items | Reason |
| --- | --- |
| `Read` of secret files, `rm -rf` of `/`, `/*`, `~`, and `~/*`, `mkfs`, and `dd` to a device | Secrets and disk wipes stay out of reach of a tool call. |
| `EnterPlanMode` and `ExitPlanMode` | Removes two tool lines. The [eval of 2026-10-08](Evals-0.28.0#eval-of-2026-10-08-off-switches) showed no loss. |
| `TaskCreate`, `TaskGet`, `TaskList`, `TaskStop`, and `TaskUpdate` | Removes five tool lines. The [eval of 2026-10-08](Evals-0.28.0#eval-of-2026-10-08-off-switches) showed no loss. |
| `Agent(general-purpose)` | Removes an agent line, and a run of this agent replaced the dotclaude agents ([Usage evidence](Usage-Evidence)). |
| `Agent(claude-code-guide)` and `Agent(statusline-setup)` | Removes two agent lines from each request. |
| `mcp__computer-use` | A guard for the case that you enable the opt-in server ([Computer use](Off-Switches#computer-use)). |
| `ScheduleWakeup` | Removes the tool. It has no setting ([Prompt surface](Prompt-Surface)). |
| `ReportFindings` | Removes the tool. `/code-review` gives its findings as text without it ([Prompt surface](Prompt-Surface)). |

The status line entries need the absolute path of the plugin folder, because a status line command gets no `${CLAUDE_PLUGIN_ROOT}`.

## Auto mode lists

The snippet does not hold the `autoMode` lists.
Setup writes them to the user settings, because Claude Code reads `autoMode` only from there.

- `allow`: `$defaults`, and two entries for the worktree and the temp folder.
- `soft_deny`: `$defaults`, and the `ask` rules of the catalog.
- `hard_deny`: `$defaults`, and the `floor` and `subagent` rules of the catalog.
- `environment`: `$defaults` only.

Each list starts with `$defaults`, which takes the built-in list of Claude Code.
The rules are in [The destructive floor](Guards#the-destructive-floor).

## Keys that the snippet does not set

- `cleanupPeriodDays`: see [Retention](#retention).
- `enableAllProjectMcpServers`: the value `false` equals the default.
- `effortLevel`: each model keeps its default.
- The keys of the never-set list and the items without a gate: see [Off switches](Off-Switches).
- `managed-settings.json`: dotclaude writes no managed file, see [Off switches](Off-Switches#managed-settings).

## Mythos detection

Setup puts `claude-mythos-5-1` in place of `claude-fable-5-1` in `availableModels` when the model catalog of your account offers it.
Claude Code 2.1.296 caches the catalog that the API serves to the account in `<config dir>/cache/model-catalog/<organizationUuid>-<hash>-<surface>.json`.
The organization comes from `oauthAccount.organizationUuid` in `.claude.json`.
The bundle of 2.1.296 has its own check for a Mythos row of the catalog, which is not `disabled` and not in the `deprecated` section, and setup makes the same test.
This was found by reading the bundle, and no doc covers this file.
A missing file, another shape, or a new release that moves the file gives no Mythos, and setup keeps Fable.
A list that already holds `claude-mythos-5-1` keeps it.
This read needs no model call, so it replaces the probe below for setup.

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

2. Read the output.
   The call is served by Mythos 5.1 only when the exit code is 0 and `modelUsage` has one key, `claude-mythos-5-1`.
3. If so, put `claude-mythos-5-1` in `availableModels` in place of `claude-fable-5-1`.
   If not, keep `claude-fable-5-1`.

A call for a model outside `availableModels` falls back to another model with no error.
So `is_error` is not a test, and `modelUsage` is.
A live probe on 2026-10-08 exited with 0 and the result `ok`, but `modelUsage` named only `claude-opus-5-5`.
That account was not served by Mythos 5.1, so Fable 5.1 stays.

## Retention

The snippet sets no `cleanupPeriodDays`, so the Claude Code default of 30 days applies.
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
