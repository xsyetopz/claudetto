# Off-switches in Claude Code 2.1.293

Sources: `external/cc-2.1.293/strings.txt` (byte offsets below), and the public docs
(`code.claude.com/docs/en/env-vars`, `settings-reference`, `tools-reference`).
"D" = documented in the public docs. "B" = bundle only.
"0.27" = already set by dotclaude 0.27.0 (`templates/settings.json`).
Prompt effect sizes are rough (chars measured in the bundle, tokens about chars/4).
Status: first pass written at the turn limit. Categories marked "not checked" are open.

## Answers to the open questions

- `maxEffortLevel` accepts `low`, `medium`, `high`, `xhigh`, `max`.
  Bundle `var Dc=["low","medium","high","xhigh","max"]` at 13372656.
  D: "a `max` value sets no cap". `effortLevel` (persisted) accepts only low..xhigh.
  `CLAUDE_CODE_EFFORT_LEVEL` accepts `low|medium|high|xhigh|max|auto`.
- Built-in plugin enable state is `enabledPlugins["<name>@builtin"]`, else `defaultEnabled ?? true`.
  Code at 16092766 (`oK()`): `s=${t}@${Oi}`, `Oi="builtin"`.
  Names carry the `cc-plugin-` prefix, for example `cc-plugin-tips@builtin`.
  An alias map at 15886464 also maps short names (`tips`) to `cc-plugin-tips`.
- Keys in the Global config scope (`~/.claude.json`, not `settings.json`):
  `autoConnectIde`, `autoInstallIdeExtension`, `claudeInChromeDefaultEnabled`,
  `copyFullResponse`, `copyOnSelect`, `defaultToAgentsView`, `diffTool`,
  `externalEditorContext`, `leftArrowOpensAgents`, `prStatusFooterEnabled`.
  Default config object at 15675500+ (`autoConnectIde:!1`, `autoInstallIdeExtension:!0`).
  `setup.mjs` that only writes `settings.json` cannot set these. Use the env vars instead.
- Restrictive-merge list (a restrictive value in any source wins) at 13372958.
  It lists keys that are off-switches by design (see Settings table).

## Env vars

| name | kind | values | turns off | prompt effect | quality risk | doc | evidence / note |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT | env | 1 | long system prompt, long tool descriptions | LARGE | medium: shorter tool guidance | D | 0.27 set |
| CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS | env | 1 | git commit/PR text in Bash tool description + git status snapshot | LARGE: ~6.2k chars (21651975..21658300) + snapshot | low | D | 21536117. Same as `includeGitInstructions:false`. Check dotclaude git guards do not read the snapshot |
| CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS | env | 1 | Explore, Plan agents | small | low | D | 0.27 set. 21066594 |
| CLAUDE_CODE_DISABLE_FAST_MODE | env | 1 | fast mode | none | none | D | 0.27 set |
| CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY | env | 1 | quality surveys | none | none | D | 0.27 set |
| CLAUDE_CODE_FORK_SUBAGENT | env | 0 | fork subagents | small | low | D | 0.27 set |
| DISABLE_COMPACT | env | 1 | all compaction | none | HIGH: no `/compact` | D | 0.27 set (project choice) |
| DISABLE_ERROR_REPORTING | env | non-empty (even 0) | error reports | none | none | D | 0.27 set |
| DISABLE_FEEDBACK_COMMAND | env | 1 | /feedback, /bug, /share, drafted feedback | small | none | D | 0.27 set |
| DISABLE_TELEMETRY | env | non-empty (even 0) | telemetry, GrowthBook fetch | none | low: flags use code defaults | D | not set in 0.27. Safe-list at 13397900 |
| CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC | env | non-empty | auto-update, telemetry, error reports, /feedback, release notes, PR badge check, fast-mode check | none | low | D | not set in 0.27 |
| DO_NOT_TRACK | env | any | telemetry | none | none | D (in surveys text) | safe-list 13397900 |
| DISABLE_GROWTHBOOK | env | 1/true | feature-flag fetch | none | medium: Remote Control unavailable, flags frozen | D | |
| DISABLE_AUTOUPDATER / DISABLE_UPDATES | env | 1 | background update / all updates | none | none | D | UPDATES blocks `claude update` too |
| DISABLE_COST_WARNINGS | env | 1 | cost warnings | none | none | D | |
| DISABLE_INSTALLATION_CHECKS | env | 1 | install warnings | none | masks issues | D | |
| DISABLE_DOCTOR_COMMAND, DISABLE_EXTRA_USAGE_COMMAND, DISABLE_INSTALL_GITHUB_APP_COMMAND, DISABLE_LOGIN_COMMAND, DISABLE_LOGOUT_COMMAND, DISABLE_UPGRADE_COMMAND | env | 1 | slash commands | none (hidden from model) | LOGIN/LOGOUT: risk for OAuth users | D | |
| CLAUDE_CODE_DISABLE_BUNDLED_SKILLS | env | 1 | bundled skills and workflows | LARGE (skill listing, capped 1% of window) | none | D | same as `disableBundledSkills` (0.27 set). 30172473 |
| CLAUDE_CODE_DISABLE_CLAUDE_API_SKILL, CLAUDE_CODE_DISABLE_CLAUDE_CODE_SKILL | env | true | single bundled skills | small | none | B | 30172473. Subsumed by the bundled-skills switch |
| CLAUDE_CODE_DISABLE_POLICY_SKILLS | env | 1 | managed skills dir | small | none | D | |
| CLAUDE_CODE_DISABLE_CFC_PROMPT | env | 1 | Chrome section of system prompt + `/claude-in-chrome` skill | medium | none | D | 30172616 |
| CLAUDE_CODE_ENABLE_CFC | env | unset/0 | Claude in Chrome (off unless set) | none | none | B | 5957385. Project settings cannot turn it on |
| CLAUDE_CODE_DISABLE_BACKGROUND_TASKS | env | 1 | `run_in_background`, Ctrl+B, auto-background | small | medium: no long-running builds in background | D | |
| CLAUDE_CODE_DISABLE_CRON | env | 1 | CronCreate/Delete/List, `/loop` | ~1.3k chars per tool | low | D | 20590282. Also add deny `ScheduleWakeup` (0.27 has) |
| CLAUDE_CODE_DISABLE_AGENT_VIEW | env | 1 | `claude agents`, `--bg`, daemon | none | none | D | same as `disableAgentView` |
| CLAUDE_CODE_DISABLE_WORKFLOWS | env | 1 | Workflow tool | ~1.2k chars | none | D | same as `disableWorkflows` |
| CLAUDE_CODE_DISABLE_ARTIFACT | env | 1 | Artifact tool | small | none | D | 0.27 uses `enableArtifact:false` |
| CLAUDE_CODE_DISABLE_ADVISOR_TOOL | env | 1 | advisor tool, `/advisor` | small | none | D | |
| CLAUDE_CODE_DISABLE_WEB_FETCH | env | 1 | WebFetch (WebSearch stays) | ~1.3k chars | HIGH if the agent needs docs | D | safe-list entry (restrictive) |
| CLAUDE_CODE_MAX_WEB_SEARCHES_PER_SESSION | env | int | caps WebSearch calls | none | low | D | |
| CLAUDE_CODE_DISABLE_ATTACHMENTS | env | 1 | `@file` expansion | none | HIGH | D | |
| CLAUDE_CODE_DISABLE_CLAUDE_MDS | env | 1 | all CLAUDE.md and auto memory | none | BREAKS dotclaude rules (CLAUDE.md) | D | do not set |
| CLAUDE_CODE_DISABLE_AUTO_MEMORY | env | 1 | auto memory | large when on | low | D | 0.27 uses `autoMemoryEnabled:false` |
| CLAUDE_CODE_DISABLE_ORG_MEMORY | env | truthy | org memory sync | small | none | B | 17150638 |
| CLAUDE_CODE_DISABLE_FILE_CHECKPOINTING | env | 1 | `/rewind` snapshots | none | medium | D | |
| CLAUDE_CODE_BASH_EDIT_DIFF | env | 0 | Bash changed-file diff | none | PostToolUse hooks lose changed-file list | D | |
| CLAUDE_CODE_DISABLE_TERMINAL_TITLE | env | 1 | terminal title + small-model title request | none | none | D | |
| CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION | env | false | prompt suggestions | none | none | D | 0.27 uses `promptSuggestionEnabled:false` |
| CLAUDE_CODE_ENABLE_AWAY_SUMMARY | env | 0 | recap | none | none | D | 0.27 uses key |
| CLAUDE_CODE_SEND_FEEDBACK | env | 0 | Claude-drafted feedback (SendFeedback tool) | small | none | D | |
| CLAUDE_CODE_ENABLE_TASKS | env | 0 | Task tools, gives TodoWrite (~9.9k chars at 28959638) instead | swaps | n/a | D | do NOT set 0: raises prompt |
| CLAUDE_CODE_ENABLE_TODO_TOOLS | env | unset | task tools on all models | none | none | D | leave unset |
| CLAUDE_CODE_TODO_REMINDER_MODE | env | `off` / `baseline` | todo nudge system-reminders (every 10 turns) | small, recurring | low | B | 24423202 |
| CLAUDE_CODE_SILENT_TURN_REMINDER (+_TEXT,_TURNS, _SECONDS) | env | bool | "user hasn't heard from you" reminder | small, recurring | low | B | 24413937 |
| CLAUDE_CODE_MAX_EFFORT_REMINDER | env | bool | max-effort reminder | small | none | B | 16631333. Default is flag-driven |
| CLAUDE_CODE_ENABLE_TOKEN_USAGE_ATTACHMENT | env | unset | token usage attachment (off unless set) | small | none | B | 24487003 |
| CLAUDE_CODE_ATTRIBUTION_HEADER | env | 0 | version + fingerprint block at system prompt start | small | none | D | |
| CLAUDE_CODE_REMOVE_PROMPT_STRINGS | env | JSON list | removes listed strings from prompts (ablation) | variable | HIGH (can break guard text) | B | 21668515 |
| CLAUDE_CODE_MAX_MCP_DESCRIPTION_LENGTH | env | int (2048) | truncates MCP tool desc + server instructions | scales with MCP | low at ~1024 | D | |
| ENABLE_TOOL_SEARCH | env | true/false/auto | defers MCP tools | LARGE with many MCP | low | D | default defers already |
| ENABLE_CLAUDEAI_MCP_SERVERS | env | false | claude.ai connectors | LARGE if connectors exist | none | D | same as `disableClaudeAiConnectors` |
| CLAUDE_CODE_SKIP_PLUGIN_MCP_SERVERS (+_EXCEPT) | env | 1 | MCP servers of plugins | variable | HIGH if a dotclaude plugin ships MCP | B | 9076528 |
| CLAUDE_CODE_DISABLE_OFFICIAL_MARKETPLACE_AUTOINSTALL | env | 1 | auto-register official marketplace | none | none | D | |
| CLAUDE_CODE_IDE_SKIP_AUTO_INSTALL | env | 1 | IDE extension auto-install | none | none | D | = `autoInstallIdeExtension:false` (global config) |
| CLAUDE_CODE_AUTO_CONNECT_IDE | env | false | IDE auto-connect | small (IDE context) | low | D | use this, since the key is global config |
| CLAUDE_CODE_HIDE_CWD | env | 1 | cwd in logo | none | none | D | |
| CLAUDE_CODE_HIDE_SETTINGS_HINT | env | truthy | settings hint | none | none | B | 13245249 |
| CLAUDE_CODE_DISABLE_NONSTREAMING_FALLBACK, _REFUSAL_FALLBACK, CLAUDE_CODE_NO_MODEL_FALLBACK, _MODEL_ACCESS_FALLBACK | env | 1 | model/stream fallbacks | none | medium: hard fail instead of fallback | D / B | NO_MODEL_FALLBACK is B |
| CLAUDE_CODE_DISABLE_1M_CONTEXT | env | 1 | 1M window | none | holds to 200K | D | conflicts with 300000 window choice, check |
| CLAUDE_CODE_DISABLE_LEGACY_MODEL_REMAP | env | 1 | Opus 4.0/4.1 remap | none | none | D | |
| CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING | env | 1 | adaptive thinking (4.6 only) | none | n/a for 5.x | D | |
| MAX_THINKING_TOKENS | env | 0 | extended thinking | none | HIGH | D | do not set |
| CLAUDE_CODE_DISABLE_THINKING | env | 1 | omits `thinking` param | none | unclear | D | compat only |
| CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS | env | 1 | beta headers, defer_loading | none | medium | D | |
| DISABLE_INTERLEAVED_THINKING | env | 1 | interleaved thinking beta | none | medium | D | |
| CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS | env | int | caps subagents | none | none | D | 0.27 set 5 |
| CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH | env | 1 | nested subagents | none | low | D | candidate |
| CLAUDE_CODE_MAX_TOOL_USE_CONCURRENCY, CLAUDE_CODE_MAX_TURNS, BASH_MAX_OUTPUT_LENGTH, CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS, MAX_MCP_OUTPUT_TOKENS | env | int | shrink limits | none (less context) | medium | D | tune only if needed |
| CLAUDE_AGENT_SDK_DISABLE_BUILTIN_AGENTS | env | 1 | all built-in agents, `-p` only | small | n/a interactive | D | 8604553 |
| CLAUDE_CODE_SIMPLE | env | 1 | hooks, skills, plugins, MCP, memory, CLAUDE.md all off | LARGE | BREAKS dotclaude (hooks+plugin) | D | do not set. Same as `--bare` |
| CLAUDE_CODE_SAFE_MODE | env | 1 | troubleshooting mode, same loss | LARGE | BREAKS dotclaude | D | do not set |
| CLAUDE_CODE_DISABLE_HOME_SETTINGS_SEED,_HOOK_FORWARDING,_PLUGIN_FORWARDING,_LAUNCH_COMPOSER,_VITALS_EMITTER,_WORKING_SYNC,_TURN_HANDOFF,_STARTUP_WORK_GATE, _PROACTIVITY, *MEMORY** | env | truthy | internal sync, forwarding, proactive features | none / small | unknown | B | registry 12954085..12955510. Not checked in depth |
| ENABLE_LSP_TOOL, ENABLE_STUB_TOOLS, CLAUDE_CODE_PROACTIVE, CLAUDE_CODE_BRIEF, CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS | env | unset | opt-in features, off by default | none | none | mixed | leave unset |
| OTEL_*, CLAUDE_CODE_ENABLE_TELEMETRY | env | unset | OTel off unless enabled | none | none | D | leave unset |
| CTX7_* | env | n/a | not found in the bundle | n/a | n/a | n/a | not a Claude Code var |

## Settings keys

| name | kind | values | turns off | prompt effect | quality risk | doc | evidence / note |
| --- | --- | --- | --- | --- | --- | --- | --- |
| disableBundledSkills | settings, restrictive | true | bundled skills | LARGE | none | D | 0.27 set |
| skillOverrides | settings | map name -> `on\|name-only\|user-invocable-only\|off` | per skill | per skill | none | D | schema 13549310 |
| skillListingBudgetFraction / skillListingMaxDescChars | settings | 0..1 / int | shrink skill listing (default 1% / 1536 chars) | up to 1% of window | low | B | schema |
| enabledPlugins | settings | `"cc-plugin-X@builtin": false` | built-in plugins | see plugin table | see table | D (form), B (ids) | 16092766 |
| prependPlugins / appendPlugins | managed (user on bare machine) | ids | ordering of `sec-default` | none | affects hook order | B | 10671030 |
| syncClaudeAiSkills / syncClaudeAiPlugins | settings (user/local/managed) | false only | claude.ai sync | LARGE if account has skills | none | D | add both |
| disableClaudeAiConnectors | settings, restrictive | true | claude.ai connectors | LARGE if present | none | D | add |
| allowAllClaudeAiMcps / allowClaudeInChromeWithManagedMcp | managed-only | true | the opposite (lifts lockdown) | n/a | n/a | B/D | do not set |
| managedMcpServers / allowedMcpServers / deniedMcpServers / allowManagedMcpServersOnly | managed / any | lists | MCP restriction | variable | medium | D | candidate: `deniedMcpServers` |
| enableAllProjectMcpServers | settings | false | auto-approve project MCP | none | none | D | 0.27 set |
| includeGitInstructions | settings | false | git text + snapshot | LARGE (~6.2k chars) | low | D | add. Same as env var |
| attribution.commit / .pr / .sessionUrl, includeCoAuthoredBy | settings | string / bool | co-author text | tiny | none | D | 0.27 sets text (user wants it) |
| autoMemoryEnabled | settings | false | auto memory | large | low | D | 0.27 set |
| autoCompactEnabled, idleCompaction, precomputeCompactionEnabled | settings | false | compaction | none | HIGH (no compaction) | D/B | 0.27 sets first. idleCompaction `false` only |
| promptSuggestionEnabled | settings | false | suggestions | none | none | D | 0.27 set |
| awaySummaryEnabled | settings | false | recap | none | none | B (@internal) | 0.27 set |
| spinnerTipsEnabled | settings | false | spinner tips | none | none | D | add |
| spinnerTipsOverride.excludeDefault | settings | true | built-in tips | none | none | D | optional |
| feedbackSurveyRate | settings | 0 | survey | none | none | D | add |
| feedbackDrafts | settings (user/managed) | `off` | SendFeedback tool | small | none | D | add |
| terminalTitleFromRename | settings | false | rename -> title | none | none | D | optional |
| alwaysThinkingEnabled | settings | false | thinking | none | HIGH | D | do not set |
| maxEffortLevel | settings | low..max (`max` = no cap) | caps effort | none | cap lowers quality | D | 0.27 set xhigh. 13372656 |
| availableModels / enforceAvailableModels | settings | list / bool | model picks | none | none | D | 0.27 sets list. Add `enforceAvailableModels:true`. Managed copy wins |
| deniedModels / availableModelsMatch | managed-only | list / `prefix\|exact` | model block | none | none | D | candidate for managed file |
| modelPicker | settings (user/managed) | rows | picker lineup | none | none | D | optional |
| fastMode / fastModePerSessionOptIn | settings | false / true | fast mode | none | none | D | add `fastMode:false` (env already) |
| switchModelsOnFlag | settings | false | auto model switch | none | pause on flag | D | candidate |
| fallbackModel | settings | list | n/a | none | none | B | leave unset |
| disableAllHooks | settings | true | ALL hooks incl. plugin hooks | none | BREAKS dotclaude | D | do not set |
| allowManagedHooksOnly | managed | true | non-managed hooks | none | BREAKS plugin hooks unless plugin is managed-enabled | D | do not set |
| disableSkillShellExecution | settings | true | inline `!` shell in skills | none | medium | D | optional |
| disableAgentView / disableRemoteControl / disableWorkflows | settings | true | agent view, RC, workflows | small | none | D | add the first two |
| enableWorkflows / enableArtifact / disableArtifact | settings | false | workflows, Artifact | ~1.2k chars each | none | D | 0.27 set |
| disableAutoMode | settings | `disable` | auto mode | classifier | none | D | candidate |
| permissions.disableBypassPermissionsMode | settings | `disable` | bypass mode | none | none | D | 0.27 set |
| permissions deny `<ToolName>` | settings | e.g. `NotebookEdit`, `WebFetch`, `EnterPlanMode`, `Monitor`, `CronCreate`, `Workflow`, `Artifact`, `PushNotification`, `RemoteTrigger`, `SendFeedback`, `EnterWorktree`, `LSP` | removes tool + its description | each 0.5k-3.6k chars (EnterPlanMode ~3.6k at 28805002, ExitPlanMode ~1.8k at 28489835) | per tool | D | tool names from tools-reference. 0.27 denies `Agent(general-purpose)`, `ScheduleWakeup`, `ReportFindings` |
| disableDeepLinkRegistration | settings | `disable` | claude-cli:// handler | none | none | D | 13521133 |
| autoUpdatesChannel / minimumVersion | settings | channel | n/a | none | none | D | not off-switches |
| cleanupPeriodDays | settings | int | transcript retention | none | none | D | 0.27 set 14 |
| respectGitignore | settings | bool | @ picker | none | none | D | leave |
| todoFeatureEnabled | settings (global-config origin) | false | todo panel | none | none | B | 15675500 default `!0`. Untested whether it removes TodoWrite/Task tools |
| autoConnectIde, autoInstallIdeExtension, claudeInChromeDefaultEnabled, prStatusFooterEnabled | global config only | false | IDE connect, ext install, Chrome default, PR badge | IDE: small | none | D | NOT in `settings.json`. Use env vars |
| channelsEnabled, allowedChannelPlugins | managed | false | channels | none | none | D | default off for Teams |
| requiredMinimumVersion / requiredMaximumVersion / forceLoginMethod / allowedProviders | managed | n/a | version/provider limits | none | risk of lockout | D | not off-switches, skip |
| strictPluginOnlyCustomization (+ .skills/.agents/.hooks/.mcp) | managed | bool/list | non-plugin skills, agents, hooks, MCP | none | HIGH: blocks user hooks | D | do not set |
| disableSideloadFlags | managed | true | `--plugin-dir`, `--agents`, `--mcp-config` flags | none | breaks `just sandbox` | D | do not set |
| disableCommandPluginSources | managed | true | command plugin sources | none | none | B | candidate |
| claudeMd | managed | string | ADDS prompt text | adds | n/a | D | avoid |
| totalTokensReminder* | settings @internal | `off` | token reminder blocks | small | none | B | leave |
| modelProposedGoals | settings @internal | `disabled` | ProposeGoal tool | small | none | B | candidate |
| doneMeansMerged | settings @internal | false | keep-working nudge | small | none | B | leave |
| breakReminder / quietHours | settings | false (default) | nudges | none | none | B | already off |

## Built-in plugins (`enabledPlugins` key `cc-plugin-<name>@builtin`)

Registration at 29946700. Enable logic at 16092766.

| id | what it does | default | action | risk |
| --- | --- | --- | --- | --- |
| cc-plugin-sec-default | seats outermost on machines with managed settings; "adds no policy of its own"; holds `allowManagedModsOnly`, `allowModsToOverrideDenyRules` options. Enabled only from trusted/policy settings (`enabledFromPolicyOnly`) (11803713, 48201300) | on with managed settings | DO NOT disable | keeps org policy out of plugin reach. Needs `prependPlugins` check with the managed template |
| cc-plugin-agents-md | AGENTS.md as project instructions when no CLAUDE.md (48207710) | on by default (flag `tengu_agents_md_mod`) | disable | none, repo has CLAUDE.md |
| cc-plugin-telemetry | `$.telemetry.log` for plugins (48223608) | on | disable | none |
| cc-plugin-plugin-authoring | skill that teaches function-hook plugins (48263035) | on, non-local-agent | disable | adds a skill listing entry |
| cc-plugin-mods-guide | animated panel for "how mods work" (48268800) | flag-gated | disable | none |
| cc-plugin-tips | tip scheduler (43161285) | on unless `mSo()` | disable | none |
| cc-plugin-mermaid | draws mermaid in terminal (48002182) | off by default (flag) | disable anyway | none |
| cc-plugin-responsive-mode | one-sentence reply before thinking, `defaultEnabled:false` (48036391) | off | leave off | n/a |
| cc-plugin-diff | diff panel plugin pane (48099870) | on | disable | loses panel |
| cc-plugin-you-should-know | side agent that flags issues; `defaultEnabled:false` (48187069) | off | leave off | adds model calls if on |
| cc-plugin-claude-test | `/claude-test` runner, `claude-test@builtin` (47960147) | on, flag-gated | disable | none |

## Built-in agents (21066594 Explore, 21069706 Plan, 22889653 general-purpose, 22903378 statusline-setup, 27369789 claude, 34078315 workflow-subagent, 45457654 comment-thread-analyst)

- Explore, Plan: `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS=1` (0.27 set).
- general-purpose: deny `Agent(general-purpose)` (0.27 set).
- statusline-setup, claude-code-guide (8408540): deny `Agent(statusline-setup)` and `Agent(claude-code-guide)`. Not tested in this run.
- Web fetch agent: `CLAUDE_CODE_WEB_FETCH_AGENT` (B, flag `tengu_clever_orbit`, 22789495). Ignored when `CLAUDE_CODE_SIMPLE` or `DISABLE_WEB_FETCH`.
- All built-ins: `CLAUDE_AGENT_SDK_DISABLE_BUILTIN_AGENTS` (`-p` only).

## Built-in MCP servers

- computer-use: id `computer-use` at 13409015, tools `mcp__computer-use__*`. No env or settings off-switch found yet. Not checked: gate function.
- claude-in-chrome: off unless `--chrome`, `/chrome`, `claudeInChromeDefaultEnabled`, or `CLAUDE_CODE_ENABLE_CFC` (5872767). Leave unset. Add `CLAUDE_CODE_DISABLE_CFC_PROMPT=1` to drop the prompt part.
- claude.ai connectors: `disableClaudeAiConnectors`, `ENABLE_CLAUDEAI_MCP_SERVERS=false`.
- IDE: `CLAUDE_CODE_AUTO_CONNECT_IDE=false`, `CLAUDE_CODE_IDE_SKIP_AUTO_INSTALL=1`.

## Not checked (open)

- Gate of the computer-use MCP server.
- Per-tool prompt sizes beyond the ones quoted (Agent, Bash base text, AskUserQuestion, Skill, NotebookEdit, SendMessage not located).
- Whether `todoFeatureEnabled:false` or `CLAUDE_CODE_ENABLE_TASKS` removes the task tools.
- The memory, forwarding, and sync B-only env vars listed as "not checked in depth".
- Whether the dotclaude hooks or guards read the git snapshot, or use `Agent`, `Monitor`, `EnterPlanMode`, `WebFetch` (needs a read of `plugins/dotclaude/hooks/`).

## Conflicts with dotclaude code (checked)

- `includeGitInstructions:false` and `CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS=1` CONFLICT with the profile.
  `plugins/dotclaude/lib/setup.mjs:44` records that 0.26 wrote `includeGitInstructions:false`, and 0.27 removes it
  because it "removes the git steps that the `attribution` setting needs".
  The `attribution` text is injected into the commit/PR steps of those same instructions.
  Setting the switch again drops the commit trailer and PR footer. Do not set it unless attribution moves to a hook.
- `advisorModel` is a LEGACY key (setup.mjs:45). `CLAUDE_CODE_DISABLE_ADVISOR_TOOL=1` is compatible and removes the tool.
- `plugins/dotclaude/hooks/hooks.json:47` has a `WebFetch` matcher and `lib/guard.mjs:86` reads WebFetch URLs.
  Denying or disabling WebFetch makes that guard path dead but harmless.
- No hook or lib file references `Monitor`, `EnterPlanMode`, `ExitPlanMode`, `NotebookEdit`, `TodoWrite`, `TaskCreate`, or `Skill`
  (rg over `plugins/dotclaude/hooks` and `lib`). Denying them breaks no guard. Skills directory is empty after commit 5cf4cb4.
- computer-use gate: `gJ(e)=Pn(e)===iE` at 13409703 only matches the server name. No off-switch found. Still "not checked".
