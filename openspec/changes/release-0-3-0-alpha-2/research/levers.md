# Claude Code 2.1.309 levers for claudetto

Sources: the docs at `claude-code-docs/docs/` (paths below are relative to it).
Raw data: `research/raw/levers-doc-lines.txt` (excerpts of each cited line), `research/raw/levers-current-state.txt` (live settings against the setup snippet), `research/raw/levers-tool-descriptions.txt` (tool description sizes).
Items marked "unverified" are not proven by the docs and need a test.

## Answers

### a. claude.ai synced skills (`anthropic-skills:*`)

Set `syncClaudeAiSkills: false` (`configure/settings/hooks-and-plugins.md:51`, `configure/settings/index.md:163`).
Synced skills live in `~/.claude/skills/synced/` and the name `anthropic-skills` is reserved (`extend/skills-and-commands/index.md:52`, `extend/mcp/config.md:77`).
`syncClaudeAiPlugins: false` is the plugin twin.
`ENABLE_CLAUDEAI_MCP_SERVERS=false` stops the claude.ai MCP fetch (`configure/env-vars/plugins-and-mcp.md`).
The setup snippet already sets both settings, but the live `~/.claude/settings.json` lacks them (`research/raw/levers-current-state.txt`).
That is why the skills still show.
`skillOverrides` can hide single skills (`hooks-and-plugins.md:45`, `extend/skills-and-commands/index.md:81`).
Values are `on`, `name-only`, `user-invocable-only`, `off`.
It does not reach plugin skills.
Live has `plugin-authoring: name-only`, which is a bundled skill (`bundled-skills.md:26`) and is already removed by `disableBundledSkills`.

### b. Prompts for `Monitor` on a `/tmp` file and for plugin MCP tools

`Monitor` as a bare tool rule in `permissions.allow` is valid (`configure/permissions/rules.md:77`).
No content form for `Monitor` is documented.
A path outside the working directories gives the `workingDir` reason (`configure/permissions/modes.md:68`).
Fix 1: `permissions.additionalDirectories: ["/tmp"]` (`rules.md:38`).
Fix 2: a `PermissionRequest` hook with matcher `Monitor` that returns `hookSpecificOutput.decision.behavior: "allow"` (`rules.md:84`, `extend/hooks/input-and-output.md:115`).
Plugin MCP tools are named `mcp__plugin_<plugin>_<server>__<tool>` (`extend/mcp/runtime.md:21`, `extend/hooks/configuration.md:58`).
The allow rule takes `mcp__server` or `mcp__server__tool` (`rules.md:72`).
So allow `mcp__plugin_cc-inspect_<server>` with the real server key.
A hook matcher on the bare server key never fires.
A mod `tool.check` ask goes to a person since 2.1.307 (`extend/mod-api/tool-command-config.md:54`), so a mod cannot auto-approve.
Conflict: the snippet denies `TaskStop`, but a persistent `Monitor` runs until `TaskStop` (`reference/tools/shell-and-web.md:48`).
The `worker` agent lists `Monitor` in its tools.

### c. `userConfig` with `sensitive: true` for `TYPESAFE_API_KEY`

Add `userConfig.TYPESAFE_API_KEY` to `plugins/claudetto/.claude-plugin/plugin.json` with `type: "string"`, `title`, `description`, and `sensitive: true` (`extend/plugins/manifest.md:57-68`).
`title` and `description` are required.
The name must match `^[A-Za-z_]\w*$`.
The value goes to secure storage and not to settings (`manifest.md:68`, `extend/plugins/loading.md:49`).
Hook commands get env `CLAUDE_PLUGIN_OPTION_TYPESAFE_API_KEY` (`manifest.md:60`, `loading.md:38`, `extend/hooks/configuration.md:118`).
`${user_config.KEY}` works only in exec-form hook `args`, MCP, and LSP config.
Sensitive values are not filled into skill or agent text (`extend/skills-and-commands/substitutions.md:44`).
A mod gets `register(on, options)` with `PluginOptions` (`extend/mod-api/plugin.md:60`).
Unverified: whether that object includes sensitive values.
`slices/decide/adapters/mod.ts` reads `$.env.get("TYPESAFE_API_KEY")`, so the mod must read the option instead.
`kernel/plugin-option.ts` already reads `CLAUDE_PLUGIN_OPTION_<NAME>` with a `pluginConfigs` fallback.
`statusLine` commands in `settings.json` do not get the env var (`slices/statusline/adapters/cli.ts:71`).

### d. Fast mode and per-agent `model` / `effort`

Fast mode is off through `CLAUDE_CODE_DISABLE_FAST_MODE` (`configure/env-vars/models-and-effort.md:76`).
Live and the snippet already set it.
Related settings are `fastMode` and `fastModePerSessionOptIn` (`configure/settings/model.md:28-29`).
`/fast` is gated off by the env var (`slash-commands.md:65`).
Agent `model` order: per-call `model`, then frontmatter, then `CLAUDE_CODE_SUBAGENT_MODEL`, then the main model (`extend/subagents/frontmatter.md:35`).
`CLAUDE_CODE_SUBAGENT_MODEL_FORCE=1` overrides all of them.
So frontmatter `model` already beats the snippet's `CLAUDE_CODE_SUBAGENT_MODEL`.
Agent `effort` takes `low`, `medium`, `high`, `xhigh`, `max`, or an integer (`frontmatter.md:45`).
`CLAUDE_CODE_EFFORT_LEVEL` wins over it.
`maxEffortLevel` caps effort and the lowest value wins (`configure/settings/model.md:30`).
`modelSettings` holds per-model `effortLevel`, `maxEffortLevel`, and `autoCompactWindow` (`model.md:35`).
Also in frontmatter: `maxTurns` (`frontmatter.md:37`), `autoCompactWindow` (`frontmatter.md:38`), `experimental.cacheTtl` (`frontmatter.md:49`).
The effort cost index is at `configure/models-and-providers.md:165-176`.
Opus 5.5 and Sonnet 5.5 default to `medium`.
Current agents: `researcher` sonnet-5-5 low, `reviewer` sonnet-5-5 high, `scout` haiku-5-5 low, `worker` sonnet-5-5 medium.

Task 3.2, `maxEffortLevel` and the `effort` of an agent file (method: `cc-inspect` `search_binary` and `read_module` on 2.1.309, because the hook lab stubs the engine and cannot run the clamp).
- Each API request resolves its effort with `Sw(model, Q.effortValue, …)` (`chunk-kang00hq.js:2782676`).
- Each path of `Sw` ends in `I(…)`, which clamps a string level with `JJ` to the cap of `imn(model)` (`chunk-k1pg3fc2.js:27702`, `21648`).
- `imn` takes the lowest cap of the settings files, `modelSettings.<model>.maxEffortLevel` before the top-level key (`chunk-k1pg3fc2.js:20734`).
- The schema text says that anything above the cap is clamped (`chunk-0cfgmnxm.js:199236`), and only `CLAUDE_CODE_EXTRA_BODY` escapes it.
- Result: the cap applies to an agent `effort`, so the roster needs no test of the caps. Not found: the line where an agent copies its frontmatter `effort` into `effortValue`.

Task 10.8, `next({ ...e, model })` on `TurnStepInput` (method: the types of 2.1.309 and the hook lab, which stubs the engine).
- The doc comment of `TurnStepInput` in `plugins/claudetto/.claude-plugin/types/claude-code/index.d.ts` says `model` is "Which model the request names… `next({ ...e, model })` names another", and that a hook rewrites `model` or `effort` going down. The other `model` fields of that file take "an alias (`haiku`) or a full id".
- Lab, what runs: after a handover with the model column `null`, the first main-thread step keeps the session model (`plugins/claudetto/tests/handover.test.ts`, "a step after a handover keeps the session model").
- Lab, what cannot run: the stub of `turn.step` is the end of the chain and a lab file registers one handler per event, so no lab case sees the model that a hook passes with `next`. The hooks module also holds its own copy of `PATH_TABLE`, so a test cannot set a model in the column (a debug run showed the module read `null` after the test set `sonnet`).
- Result: the alias and the full ID are not proven by a run. They need a sandbox session with the column set to `sonnet`, which task 11.7 runs.

### e. Context and compaction

`autoCompactWindow` takes a number in the documented range or `"auto"` (`configure/settings/core.md:23`).
Lookup order: `CLAUDE_CODE_AUTO_COMPACT_WINDOW`, then the setting (per model in `modelSettings`), then server data, then an experiment, then the model default (`how-it-works/context-and-compaction.md:54-62`).
The env var accepts `k` and `M` suffixes since 2.1.304 (`configure/env-vars/context-and-compaction.md:28`).
`CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` is a percent of the effective window (`context-and-compaction.md:49`).
The compact threshold is the effective window minus a fixed buffer, and the effective window is the window minus the output reserve.
The docs show whole percents only.
The decimal value in the snippet is undocumented.
Other levers:
- `CLAUDE_CODE_DISABLE_1M_CONTEXT` and `CLAUDE_CODE_MAX_CONTEXT_TOKENS`.
- `idleCompaction` and `CLAUDE_CODE_IDLE_COMPACT_MIN_TOKENS`.
- `precomputeCompactionEnabled` (undocumented, `core.md:49`).
- `PreCompact` and `PostCompact` hooks.
Live has `autoCompactWindow` and a `modelSettings` entry for haiku-5-5 (`research/raw/levers-current-state.txt`).

### f. Status line

Input fields are at `configure/status-line.md:99-185`.
They include model, `output_style`, `fast_mode`, `effort.level`, `thinking`, `context_window.*`, `cost.*`, `rate_limits.*`, `prompt_cache.*`, `workspace.*`, `worktree.*`, `pr.*`, and `agent.name`.
ANSI colors and OSC 8 links work (`status-line.md:74`).
Output shows only after exit 0 (`status-line.md:75`).
`COLUMNS` and `LINES` are set for `statusLine` only.
`refreshInterval` has a floor (`status-line.md:54`).
Event re-runs are debounced (`status-line.md:68`).
`subagentStatusLine` runs on a fixed tick that cannot change (`status-line.md:87`, `status-line.md:203`).
It gets `columns` and `tasks[]` and prints `{"id","content"}` lines.
Empty content hides the row.
A plugin can ship a default `subagentStatusLine` in its `settings.json` (`status-line.md:91`, `manifest.md:39`).
Unverified: whether `${CLAUDE_PLUGIN_ROOT}` expands there.
If it does, it replaces the `ls plugins/cache` path hack.

### g. "Running SessionStart hooks…" spinner label

The docs never name the label text.
`research/spinner.md` found the defect in the binary.
On the automatic compaction path, `hooks_start` for `session_start` is sent with no `compact_end` after it, so the label stays.
The manual `/compact` path clears it.
Lever 1: a mod `ui.render` hook on `component: "Spinner"` can rewrite `props.message` (`extend/mod-api/ui-elements.md:149-156`, `ui-events.md:24`).
It could null the message when it matches the label after a `compact` `session.start`.
Unverified: needs the mod test engine.
Lever 2: `statusMessage` on a hook sets its spinner text (`extend/hooks/handlers.md:67`).
Lever 3: `async: true` moves a hook to the background (`handlers.md:77`), but SessionStart makes the first reply wait (`extend/hooks/events.md:222`).
`CLAUDE_CODE_RESUME_SESSIONSTART_HOOKS_WAIT_MS` is undocumented (`sessions-and-storage.md:73`).

### h. Per-project MCP disable (`apple-docs`)

`projects["<path>"].disabledMcpServers` in `~/.claude.json` opts a project out of user, plugin, managed, and connector servers (`extend/mcp/settings.md:33`).
Alternative in `.claude/settings.local.json`: `deniedMcpServers: [{"serverName": "apple-docs"}]` (`configure/settings/mcp-and-channels.md:26`).
Alternative: a deny rule `mcp__apple-docs` (`rules.md:72`).
A subagent can use `disallowedTools: mcp__apple-docs__*`.
`CLAUDE_CODE_MAX_MCP_DESCRIPTION_LENGTH` caps tool descriptions and server instructions (`plugins-and-mcp.md:56`).
`alwaysLoad: false` defers tools (`extend/mcp/config.md:43`).
The claudetto settings snippet cannot write `~/.claude.json`, so use the deny rule or `deniedMcpServers` in project settings.
`apple-docs` is a user-scope server today.

### i. `IS_DEMO` and the email

`IS_DEMO` hides the account email and organization name in the header and status output (`configure/env-vars/ui-and-terminal.md:103`).
The page marks it "Differs" without detail, so verify in a real session.
Related: `CLAUDE_CODE_HIDE_CWD` (`ui-and-terminal.md:61`), `DEMO_VERSION` (undocumented, `ui-and-terminal.md:95`), `CLAUDE_CODE_USER_EMAIL` (undocumented, auth page).
The status line input has no email field.

### j. Output style, agent `description`, shorter tool and system text

Output style frontmatter: `name`, `description`, `keep-coding-instructions`, `force-for-plugin` (`configure/output-styles.md:85-88`).
`keep-coding-instructions` has no effect on the short prompt that Opus 5.5, Sonnet 5.5, and Haiku 5.5 already get (`output-styles.md:64`, `system-prompt.md:84`).
So `CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT=1` does nothing on those models.
Agent `description` is required and a literal `\n` becomes a newline (`extend/subagents/frontmatter.md:32`).
Skill listing caps: `skillListingMaxDescChars` and `skillListingBudgetFraction` (`hooks-and-plugins.md:41-42`), plus `SLASH_COMMAND_TOOL_CHAR_BUDGET`.
Mod event `tool.describe` rewrites any tool description, built-ins included, and can set `isDeferred` (`extend/mod-api/tool-command-config.md:55`, `prompts/tools.md:12`).
Largest descriptions are in `research/raw/levers-tool-descriptions.txt`: SendMessage, Workflow, ScheduleWakeup, Agent, then Bash.
The Bash description grew in 2.1.309 (`start/what-changed.md:27`).
`prompt.compose` and `prompt.section` rewrite system prompt parts (`extend/mod-api/turn-prompt.md:63-68`).
`prompt.section` skips shared sections such as `lean_body`.
`prompt.attachment` drops reminders.
The `agent` setting replaces the prompt body, and the identity line stays (`system-prompt.md:137`).
So the body of `plugins/claudetto/agents/main.md` is the system prompt lever.
`ENABLE_TOOL_SEARCH` defers tools, and a deny rule on a bare tool hides it (`rules.md:72`).

## Levers claudetto does not set and should

Doc paths are relative to `claude-code-docs/docs/`.
"Live" means `~/.claude/settings.json` (`research/raw/levers-current-state.txt`).

| Lever | Doc | Proposed value | Gain |
| --- | --- | --- | --- |
| `syncClaudeAiSkills` | `configure/settings/hooks-and-plugins.md:51` | `false` in live | Hides `anthropic-skills:*` |
| `syncClaudeAiPlugins` | `configure/settings/hooks-and-plugins.md` | `false` in live | No synced plugins |
| `ENABLE_CLAUDEAI_MCP_SERVERS` | `configure/env-vars/plugins-and-mcp.md` | `false` | No claude.ai MCP fetch or tools |
| `permissions.allow` `Monitor` | `configure/permissions/rules.md:77` | `Monitor` | No prompt for Monitor |
| `permissions.additionalDirectories` | `configure/permissions/rules.md:38` | `["/tmp"]` | No `/tmp` prompts |
| `permissions.allow` plugin MCP | `configure/permissions/rules.md:72` | `mcp__plugin_cc-inspect_<server>` | No prompt per inspect tool |
| `userConfig.TYPESAFE_API_KEY` | `extend/plugins/manifest.md:57-68` | `sensitive: true` | Key kept out of settings |
| `IS_DEMO` | `configure/env-vars/ui-and-terminal.md:103` | `1` | Hides email in header |
| `CLAUDE_CODE_HIDE_CWD` | `configure/env-vars/ui-and-terminal.md:61` | `1` | Hides path in screenshots |
| `deniedMcpServers` | `configure/settings/mcp-and-channels.md:26` | `apple-docs` per project | Fewer tools and instructions |
| `CLAUDE_CODE_MAX_MCP_DESCRIPTION_LENGTH` | `configure/env-vars/plugins-and-mcp.md:56` | a low cap | Smaller MCP text in context |
| `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS` | `configure/env-vars/` | `1` (live only) | Drops two built-in agents |
| `CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS` | `configure/env-vars/` | `1` (live only) | Drops git text, pair with `includeGitInstructions` |
| `CLAUDE_CODE_DISABLE_ADVISOR_TOOL` | `configure/env-vars/` | `1` (live only) | Drops one tool description |
| `CLAUDE_CODE_DISABLE_CFC_PROMPT` | `configure/env-vars/` | `1` (live only) | Drops browser prompt text |
| `CLAUDE_CODE_TODO_REMINDER_MODE` | `configure/env-vars/` | `off` (live only) | Fewer reminders |
| `CLAUDE_CODE_SILENT_TURN_REMINDER` | `configure/env-vars/` | `0` (live only) | Fewer reminders |
| `CLAUDE_CODE_BASH_OUTPUT_AUDIENCE_NOTE` | `configure/env-vars/` | `0` (live only) | Shorter Bash output note |
| `CLAUDE_CODE_FORK_SUBAGENT` | `configure/env-vars/` | `0` (live only) | Keeps agents on their own model |
| `CLAUDE_CODE_PLAN_V2_AGENT_COUNT` | `configure/env-vars/` | `1` (live only) | Fewer plan agents |
| `CLAUDE_CODE_PLAN_V2_EXPLORE_AGENT_COUNT` | `configure/env-vars/` | `1` (live only) | Fewer explore agents |
| `CLAUDE_CODE_MEMORY_SUBAGENT_APPEND` | `configure/env-vars/` | `1` (live only) | Memory kept in the subagent |
| `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` | `configure/env-vars/` | one value in both places | Snippet and live disagree |
| `autoDreamEnabled` | `configure/settings/` | `false` (live only) | No background memory run |
| `modelProposedGoals` | `configure/settings/` | disabled (live only) | No goal prompts |
| `useAutoModeDuringPlan` | `configure/settings/` | `false` (live only) | Plan mode stays plan mode |
| `DISABLE_TELEMETRY`, `DISABLE_GROWTHBOOK` | `configure/env-vars/` | `1` | Less network noise |
| `DISABLE_AUTOUPDATER` | `configure/env-vars/` | `1` | Version stays pinned |
| `CLAUDE_CODE_ATTRIBUTION_HEADER` | `configure/env-vars/` | `0` | Stable cache prefix |
| `attribution` | `configure/settings/` | commit and PR set to empty | No co-author text |
| `maxEffortLevel` | `configure/settings/model.md:30` | a cap such as `high` | Bounds cost |
| `fallbackModel` | `configure/settings/model.md` | a cheaper model | Fewer overload stops |
| `showThinkingSummaries` | `configure/settings/` | `true` | Visible reasoning without full text |
| `subagentPromptCacheTtl` | `configure/settings/model.md` | explicit value | Warm cache for long agents |
| `CLAUDE_CODE_MAX_TURNS` | `configure/env-vars/` | a bound | Stops runaway loops |
| `CLAUDE_CODE_MAX_TOOL_USE_CONCURRENCY` | `configure/env-vars/` | a bound | Calmer parallel tools |
| `BASH_DEFAULT_TIMEOUT_MS` | `configure/env-vars/` | a bound | Hung commands end sooner |
| `CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS` | `configure/env-vars/` | a bound | Smaller file reads |
| `CLAUDE_CODE_MAX_WEB_SEARCHES_PER_SESSION` | `configure/env-vars/` | a bound | Bounds web cost |
| `disableSkillShellExecution` | `configure/settings/hooks-and-plugins.md` | `true` | Safer skills |
| `skillListingMaxDescChars` | `configure/settings/hooks-and-plugins.md:41` | a low cap | Smaller skill list |
| `cleanupPeriodDays`, `fileCheckpointingEnabled`, `plansDirectory` | `configure/settings/` | project choice | Tidier storage |
| `terminalProgressBarEnabled`, `prefersReducedMotion`, `spinnerVerbs`, `showTurnDuration`, `viewMode` | `configure/settings/` | taste | Less terminal noise |
| Agent `maxTurns`, `disallowedTools`, `autoCompactWindow`, `memory`, `color`, `background` | `extend/subagents/frontmatter.md:37-55` | per agent | Bounded, scoped agents |
| Skill `paths`, `disable-model-invocation`, `model`, `effort` | `extend/skills-and-commands/` | per skill | Fewer listed skills, cheaper runs |
| `subagentStatusLine` in plugin `settings.json` | `configure/status-line.md:91` | `${CLAUDE_PLUGIN_ROOT}` command | Removes the path hack |
| Mod `tool.describe` | `extend/mod-api/tool-command-config.md:55` | shrink Agent, Bash, Workflow, Skill | Smaller tool block every turn |
| Mod `ui.render` on `Spinner` | `extend/mod-api/ui-elements.md:149-156` | null the stuck label | Fixes the spinner label |
| `PostToolUse` formatter hook | `extend/hooks/events.md` | project formatter | Clean edits without model turns |
| `FileChanged` hook | `extend/hooks/events.md` | reload on config change | Fresh state |
| `sandbox.filesystem.allowRead` | `configure/permissions/sandbox.md` | needed paths | Fewer sandbox asks |

Rows marked "live only" are set in `~/.claude/settings.json` but absent from `plugins/claudetto/slices/setup/snippet-0.2.0.json`.
They should move into the snippet so a fresh install matches.
The snippet has keys the live file lacks: `syncClaudeAiSkills`, `syncClaudeAiPlugins`, `bashOutputMaxChars`, `enforceAvailableModels`, `availableModels`, `feedbackSurveyRate`, `includeGitInstructions`, `model`, and the deny entries `Bash(rm -rf /*)`, `Bash(rm -rf ~/*)`, `TaskStop`.
Those should reach the live file or be dropped on purpose.

## Levers claudetto sets that 2.1.309 changed, removed, or made moot

- `CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT=1` does nothing on Opus 5.5, Sonnet 5.5, and Haiku 5.5 (`configure/output-styles.md:64`, `system-prompt.md:84`).
- `skillOverrides` entry `plugin-authoring` is redundant with `disableBundledSkills` and does not touch plugin skills (`bundled-skills.md:26`).
- `sandbox.excludedCommands` changed in 2.1.309 (`configure/permissions/sandbox.md:45`).
  While the sandbox is on but cannot run, excluded commands ask before writing to write-list paths, and the unsandboxed fallback is refused.
  Only managed, `--settings`, and user entries count.
- `CLAUDE_CODE_SUBAGENT_MODEL` is overridden by frontmatter `model` on every claudetto agent (`extend/subagents/frontmatter.md:35`).
  It only matters for agents without a `model`, such as `main`.
- `CLAUDE_CODE_PROMPT_CACHE_TTL` at the one-hour value is already the subscription default (`configure/settings/model.md:36`).
- `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` with a decimal is undocumented, so a future release may reject it.
- `bashOutputMaxChars` is bounded by the range at `configure/settings/core.md:30`, so check the snippet value against it.
- The `TaskStop` deny conflicts with `Monitor` in the `worker` agent.
- `DISABLE_UPGRADE_COMMAND` sits behind a flag, so it may do nothing.
- The Bash tool description grew in 2.1.309 (`start/what-changed.md:27`), so any claudetto text that restates Bash rules costs more now.
- The `cc-plugin-*@builtin` ids in the snippet are not checked against the docs.
- No other 2.1.309 change to settings, hooks, or commands touches claudetto.

## Task 9.11: Hidden Levers With Pins (2026-10-23)

Method: `/tmp/claudetto-bench/lever-probe.ts` sizes the first request body of a stub run (no login, no cost) on Claude Code 2.1.309 with the full snippet `env` and one added var.
The base request has 21,969 bytes.
Tokens are derived at 4 bytes for each token (an estimate, not a count).
The tags come from `how-it-works/context-budget.md`, `prompts/index.md`, `prompts/override.md`, `reference/probes.md`, and the env var pages of `configure/`.

### Adopted

None new. Each row of `context-budget.md` and `prompts/override.md` that removes text with no loss is already in `SNIPPET` (`plugins/claudetto/slices/setup/prompts.ts`) and has a pin in `tests/claudetto/setup/pin-effect.test.ts`.
Their savings (measured by the docs on 2.1.305, Opus 5.5): deny `Workflow` 1,969 tokens, `ScheduleWakeup` 1,675, `ReportFindings` 807, `autoMemoryEnabled: false` 691, `CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS` 348, `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS` 324.
The code lever of this task is the pre-check in `namesSecret` (`plugins/claudetto/slices/guard/domain/paths.ts:73`), 2.2 to 2.6 µs less for each `Bash` call (`evidence.md`), with an equality test against the old function.

### Rejected

| Lever | Measured change | Reason |
| --- | --- | --- |
| `CLAUDE_AGENT_SDK_DISABLE_BUILTIN_AGENTS=1` (Undocumented) | +81 bytes (about +20 tokens) | Print mode only, and the `Agent` tool text grows. The snippet already denies each built-in agent. |
| `CLAUDE_CODE_DISABLE_CLAUDE_API_SKILL=1`, `CLAUDE_CODE_DISABLE_CLAUDE_CODE_SKILL=1` (Undocumented) | 0 | `disableBundledSkills` already removes the skills. |
| `CLAUDE_CODE_DISABLE_EXPLORE_INHERIT_CAP=1` (Undocumented) | 0 | The snippet removes `Explore`. |
| `CLAUDE_CODE_ARTIFACT_OPENING_PREFETCH=false` (Undocumented) | 0 | Artifacts are off. The time saved is not measurable in a stub run. |
| `CLAUDE_CODE_DISABLE_PROACTIVITY=1` (Undocumented) | 0 | No effect that a stub run shows. |
| `CLAUDE_CODE_ACT_DONT_REDERIVE=0`, `CLAUDE_CODE_THISTLE_GREBE=no_nudges`, `CLAUDE_CODE_TOASTY_THIMBLE=0` (Undocumented, Gated) | 0 | Off in a stub run, and a change would alter the steer text of the model (a loss that only group 11 can rule out). |
| `CLAUDE_CODE_TURN_UPDATES=0`, `CLAUDE_CODE_BISON_CAIRN=0` (Undocumented) | 0 | Off by default, so nothing to save. |
| `CLAUDE_CODE_SKIP_PLUGIN_MCP_SERVERS` (Undocumented) | not run | Drops the MCP servers of plugins (a loss). It is in `NEVER_SET_ENV`. |
| `CLAUDE_CODE_SIMULATE_PROXY_USAGE` (Undocumented) | not run | Removes the whole `anthropic-beta` header (a loss). |
| `CLAUDE_CODE_MESSAGES_PROMPT_CACHE_TTL` (Undocumented) | not run | Forces the cache TTL to `5m` (a loss). |
| `DISABLE_GROWTHBOOK`, `CLAUDE_CODE_DISABLE_STARTUP_WORK_GATE` (Undocumented) | not run | They change which gated features and start tasks run. |
| `todoFeatureEnabled: false` (Undocumented) | not run | It hides the task panel and no token saving is shown. |

### Left for Task 11.x

These need a paid run to show the saving or the absence of loss.
- `precomputeCompactionEnabled` (Undocumented): it builds the compaction summary early, which saves time at the compact and adds model calls, so its net cost needs a paid run.
- `CLAUDE_CODE_SLEEP_COMPACT` and `CLAUDE_CODE_SLEEP_COMPACT_AFTER_MS` (Undocumented): the same trade of cost for time.
- The prompt flags in the table above, in a real session with the server flags: the paired eval of task 11.7.
- `CLAUDE_AGENT_SDK_DISABLE_BUILTIN_AGENTS=1` in a real `-p` session: whether plugin agents stay listed (`evidence.md` has the same item).

The rejected rows with a measured size are in `src/wiki/claudetto/rationale/Decisions-Engine.md` ("Why These Hidden Levers Stay Unset").
