# P2 Settings, Permissions, and CLI Matrix for Claude Code 2.1.306

Input: every line of `/tmp/claude-501/sweep/parts/p2-settings-perms-cli.tsv` (922 lines, from `wc -l`).
Docs paths are relative to `claude-code-docs/docs/`.
`D` is documented, `U` is undocumented, `X` is experimental or gated.
Savings are unmeasured unless a number has a source in the same cell.
Every `set` of a `U` or `X` key needs a pin test that fails when Claude Code changes it.
Env var rows follow `p1-env-vars.md`.
A settings key that is the same switch as a p1 env var is not set twice.
A key goes through the snippet that `claudetto-setup` writes, except `agent` and `subagentStatusLine`, which go through the plugin `settings.json` (`extend/plugins/manifest.md:39`).
Prices: Opus 5.5 is `4` input, `20` output, `8` 1-hour cache write, and `0.2` cache read in dollars for each million tokens (`configure/models-and-providers.md:145`, all `U`).

## Rows with a Decision (Set, Drop, Replace)

| Name | Source | Decision | Reason and saving |
| --- | --- | --- | --- |
| `permissions.disableAutoMode` | `configure/permissions/rules.md:39` (D) | set `"disable"` | The auto mode classifier is off. Saves about 19k to 35k tokens for each review (`openspec/changes/0-3-0/architecture.md:127`). |
| `auto` mode and `autoMode` | `configure/permissions/modes.md:38`, `configure/permissions/auto-mode.md:52` (D) | replace | The classifier and the `autoMode` rules (a 0.1.0 leftover that `cleanup.ts` removes) give way to static `deny` rules and the mod `tool.check` gate. Same saving as the row above. |
| `useAutoModeDuringPlan` | `configure/settings/extra-keys.md:21` (D) | set `false` | Belt and braces. Plan mode uses auto semantics only when auto mode is available, and a probe must confirm that no classifier call runs in plan mode (Open 3). |
| `permissions.defaultMode` | `configure/permissions/rules.md:35` (D) | set `"acceptEdits"` | Edits in the workspace need no prompt. `bypassPermissions` needs a launch flag and `dontAsk` turns each `ask` of a gate into a deny (`configure/permissions/modes.md:36`, `:39`, `:40`). Unmeasured. |
| `permissions.allow` | `configure/permissions/rules.md:32` (D) | set (broad) | Allows each tool, so no prompt stops a turn. The 0.2.0 list of `Bash` prefixes is a subset of `Bash`. Unmeasured. |
| `permissions.deny` | `configure/permissions/rules.md:34` (D) | set | Secret reads, destructive `git`, destructive system commands, built-in agents, and the tool denies of `p5a-tools.md`. A rule works when mods do not load (`architecture.md:113`). 0 tokens. |
| `permissions.ask` | `configure/permissions/rules.md:33` (D) | replace | The 0.2.0 list (`git`, `docker`, `rm`, `sudo`, publish, `gh`, `DROP`) gives way to `deny` rules and one `tool.check` hook. An `ask` rule wins over each `allow` (`rules.md:33`), so `Bash(rm -r*)` can never be cleared. Each prompt stops one turn, unmeasured. |
| `permissions.disableBypassPermissionsMode` | `configure/permissions/rules.md:36` (D) | drop | 0.2.0 sets `"disable"`. It removes an escape hatch of the user and saves nothing. |
| `agent` (plugin `settings.json`) | `configure/settings/agents-and-remote.md:20` (D), `configure/cli/flags.md:163` (D) | replace | The built-in main thread gives way to the plugin agent `claudetto:main`. Its body is 5,499 characters less than the default body (`architecture.md:77`), about 1.4k tokens on each request (proposed estimate: 5,499 divided by 4 characters for each token). |
| `subagentStatusLine` (plugin `settings.json`) | `configure/status-line.md:55` (D), `configure/settings/agents-and-remote.md:43` (D) | set | A command row for each subagent. 0 tokens. |
| `statusLine` | `configure/status-line.md:50` (D), `configure/settings/hooks-and-plugins.md:47` (D) | set | `type` `command`, `padding` `0`, `hideVimModeIndicator` `true`, and `refreshInterval` from `tools/limits.ts` (1 in 0.2.0). 0 tokens. See Open 8. |
| `/statusline` | `configure/status-line.md:56` (D) | replace | The built-in command asks a model to write a script. `claudetto-statusline` replaces it, and `command.describe` hides `/statusline`. Saves one model run for each use, unmeasured. |
| `outputStyle` | `configure/settings/hooks-and-plugins.md:37` (D), `configure/output-styles.md:59` (D) | set `"claudetto:Concise"` | Selects the plugin style. See Open 2. |
| `Concise` (built-in style) | `configure/output-styles.md:51` (D) | replace | `claudetto:Concise` adds the writing rules (Chicago title case, ASD-STE100) and is selected in its place (`architecture.md:41`). Unmeasured. |
| `autoMemoryEnabled` | `configure/settings/core.md:26` (D), `configure/memory-and-rules.md:80` (D) | set `false` | Memory is off. Removes the memory prompt section and the load of `MEMORY.md`, at most 200 lines or 25KB (`configure/memory-and-rules.md:97`). Unmeasured. |
| `autoDreamEnabled` | `configure/settings/core.md:24` (U), `configure/memory-and-rules.md:87` (U) | set `false` | Stops the background memory consolidation, which is a model run. A value here overrides the server default. Pin test needed. Unmeasured. |
| `modelProposedGoals` | `configure/settings/agents-and-remote.md:35` (U) | set `"disabled"` | Built-in goals are off (D6 of `p5a-tools.md`). The model does not propose goals. Pin test needed. Unmeasured. |
| `autoCompactWindow` | `configure/settings/core.md:23` (D) | set `300000` | Kept from 0.2.0 (`CONTEXT_WINDOW` in `src/kernel/budget.ts:12`). The handoff trigger depends on it, and the handoff eval can change it (Open 9). Each turn reads fewer cached tokens than at the 1M window, which is a dollar saving at `0.2` for each million cache-read tokens on Opus 5.5 (`models-and-providers.md:145`). Unmeasured. |
| `modelSettings` | `configure/settings/model.md:35` (D) | set `claude-haiku-5-5` window | Kept from 0.2.0 (`HAIKU_AUTOCOMPACT_WINDOW`). Same eval as the row above. Unmeasured. |
| `disableClaudeAiConnectors` | `configure/settings/mcp-and-channels.md:27` (D) | set `true` | No fetch of claude.ai connectors at start and no connector tools. Same lever as p1 `ENABLE_CLAUDEAI_MCP_SERVERS`. Unmeasured. |
| `syncClaudeAiSkills` | `configure/settings/hooks-and-plugins.md:51` (D) | set `false` | Skills of the claude.ai account stay out of the skill listing (1% of the window, `hooks-and-plugins.md:43`). Unmeasured. |
| `syncClaudeAiPlugins` | `configure/settings/hooks-and-plugins.md:50` (D) | set `false` | Same reason for plugins. Unmeasured. |
| `worktree` | `configure/settings/core.md:55` (D) | set `{"baseRef":"head"}` | Kept from 0.2.0. The built-in worktree replaces `patch`, and an agent worktree must start from the current `HEAD` (`architecture.md:47`). No token effect. |
| `disableBundledSkills` | `configure/settings/hooks-and-plugins.md:29` (D) | set `true` | Removes the bundled skills from the listing (`extend/skills-and-commands/bundled-skills.md:23`). `/doctor` stays. Unmeasured. |
| `enableWorkflows` | `configure/settings/agents-and-remote.md:32` (D) | set `false` | Removes the `Workflow` tool, `-1,969` tokens on each request (`how-it-works/context-budget.md:64`). |
| `enableArtifact` | `configure/settings/core.md:37` (D) | set `false` | Removes the `Artifact` tool (`p5a-tools.md`). Unmeasured. |
| `promptSuggestionEnabled` | `configure/settings/ui.md:31` (D) | set `false` | A prompt suggestion is a model run after a turn. Saves up to one request for each turn. Unmeasured. |
| `awaySummaryEnabled` | `configure/settings/core.md:28` (D) | set `false` | A recap is a model run when the user comes back. Saves one request for each return. Unmeasured. |
| `feedbackSurveyRate` | `configure/settings/ui.md:26` (D) | set `0` | Kept from 0.2.0. It is the same lever as p1 `CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY`, so the env var is dropped there. Unmeasured. |
| `feedbackDrafts` | `configure/settings/ui.md:25` (D, but U in `configure/settings/index.md:165`) | set `"off"` | Kept from 0.2.0. Stops queued feedback drafts. The two pages disagree on the status, so pin it. Unmeasured. |
| `enabledPlugins` | `configure/settings/hooks-and-plugins.md:33` (D) | set (13 `cc-plugin-*@builtin` entries `false`) | Kept from 0.2.0. Only 6 built-in plugins are in the docs (`extend/mod-api/nouns-and-gates.md:123`), so the names `claude-test`, `easel`, `mermaid`, `mods-guide`, `responsive-mode`, and `tips` are `U`. See Open 7. Unmeasured. |
| `skillOverrides` | `configure/settings/hooks-and-plugins.md:45` (D) | set `{"plugin-authoring":"name-only"}` | Kept from 0.2.0. Shrinks one listing entry to its name. Unmeasured. |
| `env` | `configure/settings/core.md:38` (D) | set | The values are the rows of `p1-env-vars.md` and nothing else. |
| `model` | `configure/settings/model.md:31` (D) | drop | 0.2.0 sets `claude-opus-5-5`. Each agent file carries its own `model`, so a global default hides a missing field. See Open 1. |
| `availableModels` | `configure/settings/model.md:22` (D) | drop | 0.2.0 limits the picker. It saves nothing and may block a `model` of an agent file. |
| `enforceAvailableModels` | `configure/settings/model.md:26` (D) | drop | Goes with `availableModels`. |
| `includeGitInstructions` | `configure/settings/core.md:45` (D) | drop | p1 sets `CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS=1`, which wins over this key and also removes the git status (`configure/memory-and-rules.md:71`). Same lever, so one copy. |
| `bashOutputMaxChars` | `configure/settings/core.md:30` (D) | drop | 0.2.0 sets 16,000. Decision A8: a lower bound cost `+7.6%` in a paired test of 425 trials (`architecture.md:140`). The default is 30,000. |
| `spinnerTipsEnabled` | `configure/settings/ui.md:38` (D) | drop | No token, request, or dollar effect, the same rule as p1 for hidden commands. See Open 7. |
| `disableRemoteControl` | `configure/settings/agents-and-remote.md:29` (D) | drop | No token effect. See Open 7. |
| `$schema` | `configure/settings/core.md:20` (D) | drop | Editor help only. It points at a schema file of this repository that someone must keep. See Open 7. |
| `sandbox.enabled` | `configure/permissions/sandbox.md:40` (D) | drop | 0.2.0 sets `true`. claudetto writes no `sandbox` key (the user, 2026-10-21). `cleanup.ts` removes the value that 0.2.0 wrote. Removes the sandbox text from `Bash`, unmeasured. |
| `sandbox.allowUnsandboxedCommands` | `configure/permissions/sandbox.md:43` (D) | drop | Goes with `sandbox.enabled`. |
| `sandbox.excludedCommands` | `configure/permissions/sandbox.md:44` (D) | drop | Goes with `sandbox.enabled`. |
| `sandbox.network.allowedDomains` | `configure/permissions/sandbox.md:58` (D) | drop | Goes with `sandbox.enabled`. |
| `sandbox.network.allowLocalBinding` | `configure/permissions/sandbox.md:64` (D) | drop | Set by the `setup` slice for the sandbox. Has no use without it. |
| `sandbox.filesystem.allowWrite` | `configure/permissions/sandbox.md:73` (D) | drop | Set by the `setup` slice for the sandbox. Has no use without it. |

## Rows with No Change (Grouped)

| Name | Source | Decision | Reason and saving |
| --- | --- | --- | --- |
| `/model`, `--model`, `ANTHROPIC_MODEL`, `ANTHROPIC_DEFAULT_*`, `ANTHROPIC_CUSTOM_MODEL_OPTION`, `modelPicker`, `modelOverrides`, `--include-unsupported-models`, `PreModelSwitch`, and the aliases `default`, `opus`, `sonnet`, `haiku`, `fable`, `best`, `opusplan`, `sonnet[1m]` | `configure/models-and-providers.md:37-66`, `:75-82` | keep default | Agent files pick models. A global model env var would fight them. |
| `--effort`, `CLAUDE_CODE_EFFORT_LEVEL`, `effortLevel`, `maxEffortLevel`, `ultrathink`, `per-turn-control-2026-07-01` | `configure/models-and-providers.md:159-164`, `configure/settings/model.md:25`, `:30` | keep default | `CLAUDE_CODE_EFFORT_LEVEL` wins over each agent `effort` (`architecture.md:116`). A cap in `maxEffortLevel` would also lower an agent that asks for `max`. See Open 5. |
| `alwaysThinkingEnabled`, `showThinkingSummaries`, `MAX_THINKING_TOKENS`, `CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING`, `CLAUDE_CODE_DISABLE_THINKING`, `--thinking`, `--thinking-display`, `--max-thinking-tokens`, `--task-budget` | `configure/models-and-providers.md:186-193`, `configure/settings/model.md:21`, `:37`, `configure/cli/flags.md:114-117` | keep default | Per-agent effort sets the depth of thinking. A fixed budget would fight it. |
| `--fallback-model`, `fallbackModel`, `switchModelsOnFlag`, `CLAUDE_CODE_NO_MODEL_FALLBACK`, `CLAUDE_CODE_MAX_RETRIES`, `CLAUDE_CODE_RETRY_WATCHDOG`, `CLAUDE_CODE_OVERLOADED_RETRY_BASE_DELAY_MS`, `API_TIMEOUT_MS`, `CLAUDE_STREAM_IDLE_TIMEOUT_MS`, `CLAUDE_CODE_DISABLE_NONSTREAMING_FALLBACK` | `configure/models-and-providers.md:201-208`, `configure/settings/model.md:27`, `:39` | keep default | Reliability tuning. p1 keeps these (Open 4 and 5 of p1). |
| `promptCacheTtl`, `subagentPromptCacheTtl` | `configure/settings/model.md:36`, `:38` | keep default | `promptCacheTtl` is the same switch as p1 `CLAUDE_CODE_PROMPT_CACHE_TTL=1h`. The subagent TTL stays at 5 minutes (p1). |
| `totalTokensReminder`, `totalTokensReminderAfterUserTurn`, `totalTokensReminderBudget` (U) | `configure/settings/model.md:40-42` | keep default | Same switch as p1 `CLAUDE_CODE_TOTAL_TOKENS_REMINDER=off`. The default `padded-countdown` adds a reminder after each tool result, so the p1 saving applies here. |
| `bashEditDiffEnabled` | `configure/settings/core.md:29` | keep default | Same switch as p1 `CLAUDE_CODE_BASH_EDIT_DIFF=0`. |
| `autoCompactEnabled`, `idleCompaction`, `precomputeCompactionEnabled` (U), `--autocompact` | `configure/settings/core.md:22`, `:41`, `:49`, `configure/cli/flags.md:120` | keep default | The handoff eval decides the compaction path (`architecture.md:45`). `precomputeCompactionEnabled` adds a background model run, so an eval must show a gain first. |
| `fastMode`, `fastModePerSessionOptIn`, `--fast-mode` | `configure/settings/model.md:28-29`, `configure/cli/flags.md:118` | keep default | p1 sets `CLAUDE_CODE_DISABLE_FAST_MODE=1`. |
| `attribution`, `includeCoAuthoredBy`, `attribution.sessionUrl` | `configure/settings/core.md:21`, `:44`, `configure/settings/extra-keys.md:40` | keep default | The `attribution.text` mod hook owns the text (A16). Set `false` only if the hook fails. |
| `respondToBashCommands` | `configure/settings/core.md:51` | keep default | `false` saves one request for each `!` command but changes what the user sees. See Open 6. |
| `skipAutoPermissionPrompt`, `autoMode.*` rules, `claude auto-mode ...`, `/auto-mode-setup`, and the auto mode env vars | `configure/settings/extra-keys.md:20`, `configure/permissions/auto-mode.md:52-97` | keep default | The classifier is off, so nothing reaches them. |
| `permissions.blockReadsOutsideWorkingDirectories`, `permissions.additionalDirectories` | `configure/permissions/rules.md:37-38` | keep default | Tuning with no measured saving. See Open 3. |
| `skillListingBudgetFraction`, `skillListingMaxDescChars` | `configure/settings/hooks-and-plugins.md:43-44` | keep default | p1 Open 7 says to measure the skill list first. |
| `disableSkillShellExecution`, `disableAllHooks`, `hooks`, `allowedHttpHookUrls`, `httpHookAllowedEnvVars`, `pluginConfigs`, `pluginSuggestionMarketplaces` | `configure/settings/hooks-and-plugins.md:21`, `:27`, `:35-36`, `:39-40`, `:46` | keep default | `disableAllHooks` would stop the mods and the gate. The others have no cost effect. |
| `CLAUDE.md`, `~/.claude/CLAUDE.md`, `./CLAUDE.local.md`, `AGENTS.md`, `.claude/rules/**`, `@path` imports, `paths`, `claudeMdExcludes`, `CLAUDE_CODE_DISABLE_CLAUDE_MDS`, `--add-dir`, `autoMemoryDirectory`, `CLAUDE_CODE_DISABLE_AUTO_MEMORY` | `configure/memory-and-rules.md:50-82` | keep default | The instructions of the user stay. Agents drop them with `omitClaudeMd: true` (`architecture.md:66`). `autoMemoryEnabled=false` already covers memory. |
| `outputStylesPath`, `keep-coding-instructions`, `force-for-plugin`, `~/.claude/output-styles/*.md`, `.claude/output-styles/*.md`, `name`, `description` | `configure/output-styles.md:71-88` | keep default | File keys of the style. `keep-coding-instructions` has no effect on the short prompt (`output-styles.md:64`). See Open 2. |
| `default`, `Proactive`, `Explanatory`, `Learning` styles, `/output-style`, `/config` | `configure/output-styles.md:49-55`, `:60-61` | keep default | Not selected. `Proactive` removes plan mode, `Explanatory` and `Learning` add text. |
| `default`, `plan`, `dontAsk`, `bypassPermissions` modes, `--permission-mode`, `--dangerously-skip-permissions`, `--allow-dangerously-skip-permissions`, `--allowedTools`, `--disallowedTools`, `--permission-prompts`, `--restricted`, `skipDangerousModePermissionPrompt`, `PermissionRequest`, `PermissionDenied` | `configure/permissions/modes.md:35-40`, `configure/permissions/rules.md:78-85`, `configure/cli/flags.md:92-100` | keep default | Per-session choices of the user. |
| `claude doctor`, `/doctor`, `/memory`, `claude plugin ...`, `claude mcp ...`, `claude auth ...`, `claude update`, `claude install` | `configure/cli/subcommands.md:28-50` | keep default | Used as they are. `/doctor` replaces the `claudetto-sessions` audit (`architecture.md:55`). |
| `-p`, `--output-format`, `--input-format`, `--json-schema`, `--max-budget-usd`, `--max-turns`, `--no-session-persistence`, `--include-*`, `--forward-subagent-text`, `--replay-user-messages`, `--prompt-suggestions`, `--init*`, `--maintenance` | `configure/cli/flags.md:40-54`, `configure/cli/index.md:59-68` | keep default | Print mode and SDK. claudetto runs interactive sessions. |
| `-h`, `-v`, `-d`, `--debug-file`, `--verbose`, `--settings`, `--setting-sources`, `--bare`, `--safe-mode`, `--ax-screen-reader` | `configure/cli/flags.md:72-83` | keep default | Standard flags. `--bare` and `--safe-mode` stop mods, so the static `deny` rules stay (`architecture.md:113`). |
| `-c`, `-r`, `--fork-session`, `--from-pr`, `--session-id`, `-n`, `--bg`, `-w`, `--tmux`, `--agent`, `--agents`, `--plugin-dir`, `--plugin-url`, `--disable-slash-commands`, `--channels`, `--ide`, `--chrome`, `--no-chrome`, `--desktop` | `configure/cli/flags.md:143-155`, `:163-175`, `:202-205` | keep default | Session and surface flags. The `agent` setting covers the default run, so `--agent` is not needed. |
| Notification and wait keys: `agentPushNotifEnabled`, `inputNeededNotifEnabled`, `preferredNotifChannel`, `askUserQuestionTimeout`, `autoContinueAtUsageLimit`, `dialogExpiry`, `doneMeansMerged` (U), `todoFeatureEnabled` (U), `defaultView` (U) | `configure/settings/agents-and-remote.md:21-23`, `:27`, `:31`, `:33`, `configure/settings/core.md:54`, `configure/settings/extra-keys.md:26` | keep default | Choices of the user. `askUserQuestionTimeout` stays `never` so that a decision waits for the person. `doneMeansMerged` would extend runs. |
| IDE and surface keys: `autoConnectIde`, `autoInstallIdeExtension`, `claudeInChromeDefaultEnabled`, `diffTool`, `voice`, `voiceEnabled`, `copy*`, `externalEditorContext`, `leftArrowOpensAgents`, `defaultToAgentsView`, `prStatusFooterEnabled`, `axScreenReader` | `configure/settings/extra-keys.md:25`, `:27`, `:55-64` | keep default | p1 sets `CLAUDE_CODE_AUTO_CONNECT_IDE=false` and `CLAUDE_CODE_DISABLE_CFC_PROMPT=1`. The rest are display choices. |
| Core housekeeping: `autoUpdatesChannel`, `minimumVersion`, `cleanupPeriodDays`, `defaultShell`, `fileCheckpointingEnabled`, `fileSuggestion`, `language`, `plansDirectory`, `respectGitignore`, `skipWebFetchPreflight`, `attributionProject` (U), `disableArtifact` (deprecated) | `configure/settings/core.md:27`, `:33-34`, `:36`, `:39-40`, `:42`, `:46-48`, `:50`, `:53` | keep default | Disk, update, and display plumbing. `autoUpdatesChannel` is in Open 11. |
| `--system-prompt*`, `--append-system-prompt*`, `--append-subagent-system-prompt*`, `--tools`, `--plan-mode-instructions` (U), `--proactivity` (U), `--brief` (U) | `configure/cli/flags.md:96-103`, `:128-133`, `:172`, `:179` | n/a | Flag only, with no settings or env value. The agent body and the mods do the work. |
| `--system-prompt-snapshot`, `--exclude-dynamic-system-prompt-sections` | `configure/cli/flags.md:134-135`, `how-it-works/system-prompt.md:23-24` | n/a | Flag only, so claudetto cannot set them. The `prompt.context` mod and the agent body replace the machine data. See Open 10. |
| `statusLine` input fields (`session_id`, `model.id`, `cost.*`, `context_window.*`, `rate_limits.*`, `prompt_cache.*`, `workspace.*`, `pr.*`, `effort.level`, `thinking.enabled`, `vim.mode`, `agent.name`, `remote.session_id`), and the `subagentStatusLine` fields (`columns`, `tasks[].*`) | `configure/status-line.md:102-182` | n/a | Input data of the status line command, not a lever. `prompt_cache.*` and `cost.*` feed the segments of `claudetto-statusline`. |
| `statusLine.type`, `.command`, `.padding`, `.refreshInterval`, `.hideVimModeIndicator`, `CLAUDE_CODE_SAFE_MODE` | `configure/status-line.md:50-54`, `:58` | n/a | Parts of the `statusLine` row above. |
| Hook input fields for memory (`file_path`, `memory_type`, `load_reason`, `globs`, `InstructionFileKind`), `MEMORY.md`, `/pause-memory`, `CLAUDE_CODE_REMOTE_MEMORY_DIR` | `configure/memory-and-rules.md:84-113` | n/a | Hook data and limits. Memory is off. |
| Model tables: status, window, pricing, default effort, capability flags, provider IDs, `VERTEX_REGION_*` | `configure/models-and-providers.md:98-182`, `:254-305`, `:325-344` | n/a | Reference data. Used here for the price figures only. |
| Providers: `CLAUDE_CODE_USE_*`, `ANTHROPIC_BEDROCK_*`, `ANTHROPIC_VERTEX_*`, `ANTHROPIC_FOUNDRY_*`, `ANTHROPIC_AWS_*`, `AWS_REGION`, gateway discovery vars, auth helpers (`apiKeyHelper`, `awsAuthRefresh`, `forceLogin*`) | `configure/models-and-providers.md:46-47`, `:220-247`, `configure/settings/auth.md:20-31` | n/a | The plan targets the first-party API. |
| Managed-only and enterprise keys: `availableModelsMatch`, `deniedModels`, `modelPricing`, `allowManagedPermissionRulesOnly`, `allowManagedHooksOnly`, `allowedMarketplaces`, `strictKnownMarketplaces`, `blockedMarketplaces`, `strictPluginOnlyCustomization`, `forceRemoteSettingsRefresh`, `managedSourcesBehavior`, `parentSettingsBehavior`, `policyHelper*`, `requiredMinimumVersion`, `requiredMaximumVersion`, `claudeMd`, `allowedMcpServers`, `deniedMcpServers`, `managedMcpServers`, `allowManagedMcpServersOnly`, `allowAllClaudeAiMcps`, `allowClaudeInChromeWithManagedMcp`, `allowedProviders`, `prependPlugins`, `appendPlugins`, `disablePluginDirectory`, `disableCommandPluginSources`, `disableSideloadFlags`, `pluginTrustMessage`, `attributionProjectPolicy` | `configure/settings/enterprise.md:20-27`, `configure/settings/mcp-and-channels.md:20-31`, `configure/settings/hooks-and-plugins.md:20-26`, `:30-31`, `:41-42`, `:48-49` | n/a | Managed settings only. A user snippet cannot set them. |
| Cloud, remote, desktop, and host keys: `remote`, `remoteControl*`, `remoteTools`, `sshConfigs`, `sshHostAllowlist`, `isolation.*`, `daemonColdStart`, `autoUploadSessions`, `crossSessionInbound`, `isolatePeerMachines`, `processWrapper`, `teammateMode`, `disableAgentView`, `disableDeepLinkRegistration`, `disableDesktopLocalSessions`, `disableBrowserExternalNavigation`, `browserExternalPageTools`, `disableMobileSimulatorTools`, `desktopSessionCleanupPeriodDays`, `claude --cloud`, `--remote-control`, `--teleport`, `--deep-link-*`, `--prefill*`, teammate flags, SDK host flags (`--sdk-url`, `--await-*`, `--managed-settings`, `--client-data-url`) | `configure/settings/agents-and-remote.md:24-44`, `configure/settings/extra-keys.md:24`, `:35-45`, `configure/cli/flags.md:55-64`, `:187-231` | n/a | Cloud, remote, desktop, or SDK host only. |
| Workflow and teams keys: `ultracode`, `workflowKeywordTriggerEnabled`, `workflowSizeGuideline`, `disableWorkflows`, `skipWorkflowUsageWarning` | `configure/settings/agents-and-remote.md:30`, `:41`, `:45-47` | n/a | Workflows are off (`enableWorkflows=false`). |
| UI keys: `autoScrollEnabled`, `breakReminder` (U), `quietHours` (U), `companyAnnouncements`, `editorMode`, `emojiCompletionEnabled`, `footerLinksRegexes`, `maxProseWidth`, `prefersReducedMotion`, `prUrlTemplate`, `showClearContextOnPlanAccept`, `showMessageTimestamps` (U), `showTurnDuration`, `spellcheck`, `spinnerTipsOverride`, `spinnerVerbs`, `syntaxHighlightingDisabled`, `terminalProgressBarEnabled`, `terminalTitleFromRename`, `theme`, `timeFormat`, `timeZone`, `tui`, `verbose`, `viewMode`, `vimInsertModeRemaps`, `wheelScrollAccelerationEnabled` | `configure/settings/ui.md:20-52` | n/a | Display only, with no model input. |
| `claude`, `claude "query"`, `claude agents`, `claude attach`, `claude logs`, `claude stop`, `claude respawn`, `claude rm`, `claude daemon`, `claude setup-token`, `claude gateway`, `claude import`, `claude purge`, `claude remote-control`, `claude ultrareview`, `claude self-hosted-runner`, `claude sandbox` (U), `claude edit-hook` (U), `claude import-conversations` (U), `claude plugin test` | `configure/cli/index.md:36-45`, `configure/cli/subcommands.md:28-52` | n/a | Commands that run outside a session or manage the host. |
| `sandbox.*` rows other than the six above, `sandbox.credentials.*`, `sandbox.network.tlsTerminate.caCertPath` (X), `CLAUDE_CODE_BASH_SANDBOX_SHOW_INDICATOR`, `IS_SANDBOX`, `CLAUDE_CODE_SANDBOXED`, and the Windows sandbox vars | `configure/permissions/sandbox.md:41-102` | n/a | The sandbox is off and claudetto writes no key. |
| Auto mode rule names (the built-in `allow`, `soft_deny`, and `hard_deny` entries, `Environment` slots) | `configure/permissions/auto-mode-rules.md:31-160` | n/a | Classifier text. The classifier is off. |
| Permission decision reasons and safety checks: `rule`, `mode`, `hook`, `classifier`, `dangerousRemoval`, `claudeSettingsFile`, `outsideReadsBlocked`, `internalHardDeny`, and the rest | `configure/permissions/modes.md:60-88` | n/a | Output data. `dangerousRemoval` is bypass-immune and covers only critical paths, so the narrow `deny` rules and the gate sit above it. |
| Rule syntax forms and `PermissionUpdate` fields | `configure/permissions/rules.md:60-67`, `:93-96` | n/a | Syntax, used in the JSON block below. |
| Env var rows (`CLAUDE_CODE_SUBAGENT_MODEL`, `CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT`, `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`, and the like) that appear in this input | `configure/models-and-providers.md:48`, `configure/output-styles.md:64`, `configure/permissions/auto-mode.md:85-97` | n/a | Decided in `p1-env-vars.md` (`CLAUDE_CODE_SUBAGENT_MODEL` drop, `CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT` drop, the classifier vars n/a). |

## Proposed `permissions` Block

The block goes into user settings through `claudetto-setup`.
It has no `ask` list.
The `deny` list repeats what `tool.check` does, because mods do not load under `--bare`, `--safe-mode`, or `disableAllHooks`.
The tool denies follow `p5a-tools.md` (`TaskStop` is not denied there).
`ToolSearch` is not denied.

```json
{
  "permissions": {
    "defaultMode": "acceptEdits",
    "disableAutoMode": "disable",
    "allow": [
      "Bash",
      "Read",
      "Edit",
      "Write",
      "NotebookEdit",
      "Glob",
      "Grep",
      "WebFetch",
      "WebSearch"
    ],
    "deny": [
      "Read(**/.env)",
      "Read(**/.env.local)",
      "Read(**/.env.production)",
      "Read(**/.env.*.local)",
      "Read(**/.env.development)",
      "Read(**/.env.dev)",
      "Read(**/.env.staging)",
      "Read(**/.env.stage)",
      "Read(**/.env.test)",
      "Read(**/.env.prod)",
      "Read(**/.env.qa)",
      "Read(**/.env.preview)",
      "Read(~/.ssh/**)",
      "Read(~/.aws/credentials)",
      "Read(~/.gnupg/**)",
      "Read(~/.netrc)",
      "Read(~/.docker/config.json)",
      "Bash(git push* -f*)",
      "Bash(git push* --force)",
      "Bash(git push* --force *)",
      "Bash(git push* --delete*)",
      "Bash(git push* --mirror*)",
      "Bash(git reset* --hard*)",
      "Bash(git clean* -*f*)",
      "Bash(git checkout .)",
      "Bash(git checkout* -- *)",
      "Bash(git checkout* -f*)",
      "Bash(git restore .)",
      "Bash(git restore -- *)",
      "Bash(git restore* --worktree*)",
      "Bash(git restore* -W*)",
      "Bash(git restore* --source*)",
      "Bash(git branch* -D*)",
      "Bash(git branch* --force*)",
      "Bash(git stash drop*)",
      "Bash(git stash clear*)",
      "Bash(git reflog expire*)",
      "Bash(git reflog delete*)",
      "Bash(git gc* --prune*)",
      "Bash(git prune*)",
      "Bash(git filter-*)",
      "Bash(rm -rf /)",
      "Bash(rm -rf /*)",
      "Bash(rm -rf ~)",
      "Bash(rm -rf ~/*)",
      "Bash(mkfs *)",
      "Bash(mkfs.*)",
      "Bash(dd * of=/dev/*)",
      "Agent(general-purpose)",
      "Agent(claude-code-guide)",
      "Agent(statusline-setup)",
      "mcp__computer-use",
      "ScheduleWakeup",
      "ReportFindings",
      "EnterPlanMode",
      "ExitPlanMode",
      "TaskCreate",
      "TaskGet",
      "TaskList",
      "TaskUpdate",
      "DesignSync",
      "RemoteTrigger"
    ]
  }
}
```

`disableAutoMode` is shown under `permissions` because that is where `rules.md:39` puts it.
The `git` rules are the rules of `GIT_ASK` (`src/plugins/claudetto/slices/prompt/domain/git-ask.ts`) moved from `ask` to `deny`.
`Agent(Explore)` and `Agent(Plan)` are not listed, because p1 sets `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS=1`.

## Open

1. The `model` setting is dropped.
   A probe must show that the `model` field of `claudetto:main` sets the model of the main thread when the plugin `agent` setting applies.
   If it does not, set `model` again.
2. Whether the output style `claudetto:Concise` still applies when the agent body replaces the system prompt.
   `force-for-plugin` would ship the style with the plugin and need no `outputStyle` key, but it overrides the choice of the user (`configure/output-styles.md:88`).
3. A probe of `acceptEdits` with the allow list above.
   It must show no prompt for a `Read` or `Edit` outside the working directory (`workingDir` in `configure/permissions/modes.md:67`) and no classifier call in plan mode.
   `permissions.additionalDirectories` is the fix if a prompt appears.
4. The `ask` rules for `docker`, `sudo`, publish commands (`npm publish`, `cargo publish`), `gh pr merge`, `gh release`, and `DROP DATABASE` are gone, and the allow list now covers them.
   The user named only destructive `git`, secret reads, and destructive system commands.
   The user must say if `tool.check` should gate the others.
5. A cap `maxEffortLevel: "high"` would stop `max` effort, which costs up to 3.44 times the tokens of `high` on Opus 5.5 (`configure/models-and-providers.md:176`).
   It also lowers any agent that asks for `max`.
   The user decides.
6. `respondToBashCommands: false` saves one request for each `!` command.
   It changes what the user sees, so it needs a decision.
7. Some 0.2.0 keys have no token effect: `spinnerTipsEnabled`, `disableRemoteControl`, `$schema`, and the six undocumented names in `enabledPlugins`.
   The first three are dropped, and `enabledPlugins` stays for now.
   The user can ask to keep any of them.
   Whether `enabledPlugins: false` turns off `cc-plugin-telemetry` is open (`extend/mod-api/nouns-and-gates.md:118` says the settings that stop installed mods do not stop built-in ones).
8. `statusLine.refreshInterval` is 1 second in 0.2.0, so a `bun` process starts each second.
   There is no token cost, but a higher value may cost less CPU.
9. `autoCompactWindow` and the haiku `modelSettings` entry wait for the handoff eval (`architecture.md:45`).
   If handoff is dropped, the compaction keys revert to the p1 `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` decision alone.
10. `--exclude-dynamic-system-prompt-sections` and `--system-prompt-snapshot` are flags with no settings or env route.
    The `prompt.context` mod may give the same cache gain.
    A launcher alias would be extra code, so it is not proposed.
11. `autoUpdatesChannel: "stable"` or `minimumVersion` would pin the target version 2.1.306, because the undocumented levers can break on an update.
    This is a user decision.
12. Built-in `/goal` has no setting or env switch in these docs.
    `command.describe` must hide it (`OFF_COMMANDS` in 0.2.0 does not list `goal`), and `modelProposedGoals: "disabled"` only stops proposals.
13. `Agent(claude)` is a built-in type in `architecture.md:67` but is not in the 0.2.0 deny list.
    Check the real type name before adding a deny rule.
14. Pin tests are needed for the `U` keys that are set: `autoDreamEnabled`, `modelProposedGoals`, and `feedbackDrafts`.
    The two docs pages disagree on `feedbackDrafts`.
