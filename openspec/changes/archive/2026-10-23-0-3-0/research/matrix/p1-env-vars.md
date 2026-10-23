# P1 Env Vars Matrix for Claude Code 2.1.306

Input: every row of `p1-env-vars.tsv`.
Docs paths are relative to `claude-code-docs/docs/configure/env-vars/`.
`D` is documented, `U` is undocumented, `X` is experimental, `G` is gated by a feature flag.
Savings are unmeasured unless a number is given.
Every `set` of an undocumented or gated var needs a pin test that fails when Claude Code changes it.

## Rows with a Decision (Set, Drop, Replace)

| Name | Source | Decision | Reason and saving |
| --- | --- | --- | --- |
| `CLAUDE_CODE_ATTRIBUTION_HEADER` | `network-and-proxy.md:43` (D) | set `0` | Omits the attribution block at the start of the system prompt (`reference/api/endpoints.md:96`). The block carries per-request fields, so removing it helps cache stability. Unmeasured. |
| `CLAUDE_CODE_DISABLE_ADVISOR_TOOL` | `tools-and-bash.md:60` (D) | set `1` | Advisor is off, so this removes its tool schema. Saves one tool schema in each request, unmeasured. |
| `CLAUDE_CODE_DISABLE_CRON` | `agents-and-teams.md:54` (D) | set `1` | Kept from 0.2.0. Cron and `/loop` are off, so their tool schemas go. |
| `CLAUDE_CODE_DISABLE_FAST_MODE` | `models-and-effort.md:75` (D) | set `1` | Kept from 0.2.0. Fast mode bills at a premium rate. |
| `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` | `agents-and-teams.md:71` (D) | set from plan tier | `claudetto-setup` writes 2, 4, or 6 for Pro, Max 5x, and Max 20x (decision A11). |
| `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH` | `agents-and-teams.md:72` (D) | set `1` | Kept from 0.2.0. Stops nested subagent trees. |
| `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS` | `agents-and-teams.md:55` (D) | set `1` | Hides built-in `Explore` and `Plan` even when mods do not load, because the `agent.offer` hook needs mods. Shorter `Agent` description, unmeasured. |
| `CLAUDE_CODE_FORK_SUBAGENT` | `agents-and-teams.md:63` (D, G) | set `0` | Plugin agents with their own `model` replace forks. A fork copies the whole parent context. Also drops the fork text from the `Agent` description. Unmeasured. |
| `CLAUDE_CODE_MEMORY_SUBAGENT_APPEND` | `agents-and-teams.md:73` (U) | set `1` | Skips one extra block in each subagent prompt. Memory is off, so the block has no use. Unmeasured. |
| `CLAUDE_CODE_PLAN_V2_AGENT_COUNT` | `agents-and-teams.md:75` (U) | set `1` | The default is 3 on Max 20x. One agent saves up to 2 subagent runs per plan. Likely the largest dollar lever here. |
| `CLAUDE_CODE_PLAN_V2_EXPLORE_AGENT_COUNT` | `agents-and-teams.md:76` (U) | set `1` | Same reason for explore agents. Saves up to 2 subagent runs per plan. |
| `CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS` | `context-and-compaction.md:41` (D) | set `1` | Removes the git instructions (348 tokens, `how-it-works/context-budget.md:115`) and the git status snapshot (177 tokens, `context-budget.md:116`). About 525 tokens per session. The `includeGitInstructions` setting removes only the first part. |
| `CLAUDE_CODE_TOTAL_TOKENS_REMINDER` | `context-and-compaction.md:62` (U) | set `off` | Removes the `total_tokens` reminder attachment. Saves tokens per turn, unmeasured. |
| `CLAUDE_CODE_TODO_REMINDER_MODE` | `features-and-toggles.md:78` (U) | set `off` | Removes the todo nudge attachments. Saves tokens per nudge, unmeasured. |
| `CLAUDE_CODE_BASH_OUTPUT_AUDIENCE_NOTE` | `tools-and-bash.md:57` (U) | set `0` | Removes a note that a rollout can add to each `Bash` result. Saves tokens on each `Bash` call, unmeasured. |
| `CLAUDE_CODE_BASH_EDIT_DIFF` | `tools-and-bash.md:56` (D) | set `0` | Guard against diff attachments for files that `Bash` changes. Unmeasured. |
| `CLAUDE_CODE_SILENT_TURN_REMINDER` | `ui-and-terminal.md:78` (U, G) | set `0` | Guard against an extra nudge and its reply after a quiet turn. Unmeasured. |
| `CLAUDE_CODE_GLOB_NO_IGNORE` | `tools-and-bash.md:77` (D) | set `false` | `Glob` then respects `.gitignore`, so build output stays out of the result. Moot if a claudetto tool replaces `Glob` (Open item 3). |
| `CLAUDE_CODE_PROMPT_CACHE_TTL` | `models-and-effort.md:92` (D) | set `1h` | Kept from 0.2.0. The 1-hour TTL avoids cold cache writes after a pause. |
| `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` | `context-and-compaction.md:31` (D) | set `AUTOCOMPACT_PCT` | Kept from 0.2.0. The handoff trigger. |
| `CLAUDE_CODE_AUTO_CONNECT_IDE` | `ui-and-terminal.md:39` (D) | set `false` | Kept from 0.2.0. No IDE context attachments. |
| `CLAUDE_CODE_DISABLE_TERMINAL_TITLE` | `ui-and-terminal.md:49` (D) | set `1` | Kept from 0.2.0. Saves the title request. |
| `DISABLE_ERROR_REPORTING` | `telemetry-and-debug.md:74` (D) | set `1` | Kept from 0.2.0. Fewer network requests, no token effect. |
| `CLAUDE_CODE_DISABLE_CFC_PROMPT` | `plugins-and-mcp.md:40` (D) | replace with `claudetto-browser:browse` | Set `1`. The browse skill with `agent-browser` replaces Claude in Chrome, so its prompt section goes. |
| `CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT` | `models-and-effort.md:95` (D, G) | drop | Set `1` in 0.2.0. `claudetto:main` replaces the body, so the var may be redundant. Confirm with the test in Open item 1. |
| `CLAUDE_CODE_SUBAGENT_MODEL` | `models-and-effort.md:99` (D) | drop | Set in 0.2.0. Plugin agents carry their own `model`, so a global default has no use. |
| `DISABLE_EXTRA_USAGE_COMMAND` | `features-and-toggles.md:84` (D) | drop | Hides one slash command. No token, request, or dollar effect. |
| `DISABLE_FEEDBACK_COMMAND` | `features-and-toggles.md:85` (D) | drop | Same reason. |
| `DISABLE_INSTALL_GITHUB_APP_COMMAND` | `features-and-toggles.md:87` (D) | drop | Same reason. |
| `DISABLE_UPGRADE_COMMAND` | `ui-and-terminal.md:97` (D, G) | drop | Same reason. |
| `CLAUDE_CODE_IDE_SKIP_AUTO_INSTALL` | `ui-and-terminal.md:64` (D) | drop | Skips an IDE extension install. `CLAUDE_CODE_AUTO_CONNECT_IDE=false` already stops the IDE link. |
| `CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY` | `ui-and-terminal.md:45` (D) | drop | The 0.2.0 survey setting is the same lever, so the env var is a second copy. |

Count: 23 `set`, 8 `drop`, 1 `replace`.

## Rows with No Change (Grouped)

| Name | Source | Decision | Reason and saving |
| --- | --- | --- | --- |
| `CLAUDE_CODE_EFFORT_LEVEL`, `MAX_THINKING_TOKENS`, `CLAUDE_CODE_DISABLE_THINKING`, `CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING` | `models-and-effort.md` | keep default (unset) | `CLAUDE_CODE_EFFORT_LEVEL` overrides each agent `effort`, so it must stay unset. Thinking caps would fight the per-agent effort. |
| `DISABLE_PROMPT_CACHING*`, `FORCE_PROMPT_CACHING_5M`, `ENABLE_PROMPT_CACHING_1H`, `CLAUDE_CODE_MESSAGES_PROMPT_CACHE_TTL`, `CLAUDE_CODE_SUBAGENT_PROMPT_CACHE_TTL` | `models-and-effort.md` | keep default | Never lower caching. `CLAUDE_CODE_PROMPT_CACHE_TTL=1h` already covers the main thread. |
| `ENABLE_TOOL_SEARCH`, `CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS`, `CLAUDE_CODE_DISABLE_ATTACHMENTS`, `CLAUDE_CODE_SIMPLE`, `CLAUDE_CODE_SAFE_MODE` | `tools-and-bash.md`, `context-and-compaction.md`, `features-and-toggles.md` | keep default | `ToolSearch` stays on. `CLAUDE_CODE_DISABLE_ATTACHMENTS` may also kill the deferred-tools announcement. `CLAUDE_CODE_SIMPLE` and safe mode stop hooks, skills, and plugins. |
| `BASH_MAX_OUTPUT_LENGTH`, `MAX_MCP_OUTPUT_TOKENS`, `CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS`, `CLAUDE_CODE_MAX_MCP_DESCRIPTION_LENGTH`, `ENABLE_MCP_LARGE_OUTPUT_FILES` | `tools-and-bash.md`, `context-and-compaction.md`, `plugins-and-mcp.md` | keep default | Decision A8: no lower bound without a paired measurement. |
| `CLAUDE_CODE_DISABLE_1M_CONTEXT`, `CLAUDE_CODE_AUTO_COMPACT_WINDOW`, `DISABLE_COMPACT`, `DISABLE_AUTO_COMPACT` | `context-and-compaction.md` | keep default | The handoff slice owns the window through settings. |
| `CLAUDE_CODE_ACT_DONT_REDERIVE`, `CLAUDE_CODE_TOASTY_THIMBLE` | `models-and-effort.md`, `context-and-compaction.md` | keep default | Both can reduce turns. One says to act and not re-derive, the other is the batching reminder. |
| `CLAUDE_CODE_BISON_CAIRN`, `CLAUDE_CODE_LARCH_CISTERN`, `CLAUDE_CODE_WILLOW_TERN`, `CLAUDE_CODE_AMBER_ASTROLABE`, `CLAUDE_CODE_BASALT_COVE`, `CLAUDE_CODE_TURN_UPDATES` (U, G) | `models-and-effort.md` | keep default | They switch per-model prompt sections. `claudetto:main` may already replace them. See Open item 1. |
| `CLAUDE_CODE_DISABLE_*_RM_PROMPT` and the other `rm` safety vars | `tools-and-bash.md` | keep default | Built-in `rm` checks stay as a second layer under the `tool.check` guard. |
| `CLAUDE_CODE_DISABLE_BUNDLED_SKILLS`, `CLAUDE_CODE_DISABLE_WORKFLOWS`, `CLAUDE_CODE_DISABLE_ARTIFACT`, `CLAUDE_CODE_DISABLE_AUTO_MEMORY`, `CLAUDE_CODE_ENABLE_AWAY_SUMMARY`, `CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION`, `ENABLE_CLAUDEAI_MCP_SERVERS` | `plugins-and-mcp.md`, `agents-and-teams.md`, `features-and-toggles.md`, `context-and-compaction.md`, `ui-and-terminal.md` | keep default | Settings in the snippet already set the same lever. A second copy adds nothing. |
| `CLAUDE_CODE_DISABLE_WEB_FETCH`, `CLAUDE_CODE_WEB_SEARCH_*`, `CLAUDE_CODE_WEBFETCH_*`, `CLAUDE_CODE_GLOB_*` (other), `CLAUDE_CODE_USE_BUILTIN_RIPGREP` | `tools-and-bash.md` | keep default | Depends on the replace matrix. See Open item 3. |
| `CLAUDE_CODE_MAX_TOOL_USE_CONCURRENCY`, `CLAUDE_CODE_ENABLE_TASKS`, `CLAUDE_CODE_ENABLE_TODO_TOOLS`, `CLAUDE_AUTO_BACKGROUND_TASKS`, `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS`, `CLAUDE_CODE_DISABLE_AGENT_VIEW`, `BASH_DEFAULT_TIMEOUT_MS`, `BASH_MAX_TIMEOUT_MS` | `tools-and-bash.md`, `agents-and-teams.md` | keep default | Tuning with no measured saving. Background tasks and task tools are part of modern agentic workflows. |
| `CLAUDE_CODE_STOP_HOOK_BLOCK_CAP`, `CLAUDE_CODE_MAX_RETRIES`, `API_TIMEOUT_MS`, `CLAUDE_CODE_MAX_OUTPUT_TOKENS`, `CLAUDE_CODE_DISABLE_NONSTREAMING_FALLBACK`, `CLAUDE_CODE_EXTRA_BODY`, `CLAUDE_CODE_REMOVE_PROMPT_STRINGS` | `network-and-proxy.md`, `models-and-effort.md`, `sdk-and-automation.md` | keep default | Transport tuning. A lower retry bound can turn one retry into a failed turn. See Open items 4 and 5. |
| `ANTHROPIC_DEFAULT_*_MODEL*`, `ANTHROPIC_MODEL`, `CLAUDE_CODE_SUBAGENT_MODEL_FORCE`, `CLAUDE_CODE_WORKFLOW_SUBAGENT_MODEL` | `models-and-effort.md` | keep default | Agent files and `model` settings pick models. `CLAUDE_CODE_SUBAGENT_MODEL_FORCE` would override every agent `model`. |
| `DISABLE_TELEMETRY`, `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`, `DISABLE_GROWTHBOOK` | `telemetry-and-debug.md`, `network-and-proxy.md` | keep default | They may switch off the server flag `tengu_plugin_hooks_modules`, and then mods do not load. See Open item 2. |
| `CLAUDE_CODE_DISABLE_FILE_CHECKPOINTING`, `CLAUDE_CODE_SKIP_PROMPT_HISTORY`, and other session storage vars | `sessions-and-storage.md` | keep default | Disk and resume plumbing, not tokens. |
| `CLAUDE_CODE_INLINE_TOOLS` (U, G), `CLAUDE_CODE_PEWTER_OWL_TOOL` (U, G) | `tools-and-bash.md` | keep default | Gated features. `CLAUDE_CODE_INLINE_TOOLS` adds a beta header. See Open item 6. |
| Auto mode classifier: `CLAUDE_CODE_AUTO_MODE_*`, `AUTOMODE_DECISION_LOG`, `CLAUDE_CHROME_*`, `CCR_AUTO_MODE_*` | `tools-and-bash.md`, `models-and-effort.md`, `remote-and-cloud-sessions.md` | n/a | The classifier is off. |
| Advisor experimental: `CLAUDE_CODE_ENABLE_EXPERIMENTAL_ADVISOR_TOOL` | `models-and-effort.md` | n/a | Advisor is off. |
| Teams, workflows, coordinator, fleet, daemon, PTY, loop vars (`CLAUDE_CODE_EXPERIMENTAL_*`, `CLAUDE_CODE_COORDINATOR_*`, `CLAUDE_CODE_LOOP_*`, `CLAUDE_CODE_WORKFLOW_*`, `CLAUDE_BG_*`, `CLAUDE_PTY_*`, and similar) | `agents-and-teams.md` | n/a | Teams, workflows, `/goal`, `/loop`, and cron are off, or the var is host plumbing. |
| MCP, plugin sync, and CCR sync plumbing (`CLAUDE_CODE_MCP_*`, `MCP_*`, `CLAUDE_CODE_PLUGIN_*`, `CLAUDE_CODE_SYNC_*`, `CLAUDE_CODE_CCR_*`, `CLAUDE_PLUGIN_DATA`, `CLAUDE_PLUGIN_ROOT`, `CLAUDE_PROJECT_DIR`) | `plugins-and-mcp.md` | n/a | No token, request, or dollar effect, or a runtime value that plugins read. |
| Telemetry export and tracing (`OTEL_*`, `CLAUDE_CODE_ENABLE_TELEMETRY`, `CLAUDE_CODE_OTEL_*`, `TRACEPARENT`, `TRACESTATE`) | `telemetry-and-debug.md` | n/a | Export is off unless the user turns it on. |
| Debug, profiling, and bench vars (`CLAUDE_CODE_DEBUG_*`, `CLAUDE_CODE_PROFILE_*`, `DEBUG*`, `SWE_BENCH_*`, `CLAUDE_CODE_DATADOG_*`, and similar) | `telemetry-and-debug.md` | n/a | Debug only. |
| SDK and host plumbing (`ANTHROPIC_ENVIRONMENT_*`, `ANTHROPIC_WORK_*`, `CLAUDE_CODE_SDK_*`, `CLAUDE_CODE_EMIT_*`, `CLAUDE_CODE_MAX_TURNS`, and similar) | `sdk-and-automation.md`, `agents-and-teams.md` | n/a | SDK, print mode, or host app only. |
| Artifacts (`CLAUDE_CODE_ARTIFACT*`, `CLAUDE_ARTIFACT_*`) | `features-and-toggles.md` | n/a | The Artifact tool is off. |
| UI, terminal, and rendering vars (`CLAUDE_AFK_*`, `CLAUDE_AX_*`, `CLAUDE_CODE_TUI_*`, `CLAUDE_CODE_TMUX_*`, `NO_COLOR`, `FORCE_HYPERLINK`, and similar) | `ui-and-terminal.md` | n/a | Display only, no model input. |
| Platform, terminal, and CI detection (`system-and-third-party.md` rows, `CI`, `GITHUB_*`, `TERM*`, `PATH`, `HOME`, `XDG_*`, `LANG`, `LC_*`) | `system-and-third-party.md` | n/a | Read by Claude Code. Nothing for claudetto to set. |
| Cloud providers: Bedrock, Vertex, Foundry, AWS, Azure, GCP, Mantle, gateway (`cloud-providers.md` rows) | `cloud-providers.md` | n/a | The plan targets the first-party API. |
| Bundled-library vars (`bundled-libraries.md` rows) | `bundled-libraries.md` | n/a | Third-party library switches. |
| Auth and accounts (`ANTHROPIC_API_KEY`, `CLAUDE_CODE_OAUTH_*`, and similar) | `auth-and-accounts.md` | n/a | Login and secrets. |
| Proxy, TLS, and certificates | `network-and-proxy.md` | n/a | Corporate network setup. |
| Remote, cloud, bridge, self-hosted runner, Windows, PowerShell, and sandbox vars | `remote-and-cloud-sessions.md`, `tools-and-bash.md` | n/a | Cloud, remote, Windows, or enterprise only. The sandbox stays off. |
| Memory store and cowork vars (`CLAUDE_CODE_DISABLE_MEMORY_*`, `CLAUDE_COWORK_MEMORY_*`, `CLAUDE_MEMORY_STORES`) | `context-and-compaction.md` | n/a | Memory is off. |
| Vars that Claude Code sets (`CLAUDECODE`, `CLAUDE_PID`, `CLAUDE_ENV_FILE`, `CLAUDE_CODE_SESSION_ID`, `CLAUDE_CODE_AGENT`) | `tools-and-bash.md` | n/a | Written by Claude Code. |
| Deprecated: `ANTHROPIC_SMALL_FAST_MODEL`, `ENABLE_PROMPT_CACHING_1H_BEDROCK` | `models-and-effort.md` | n/a | Deprecated or provider-specific. |

## Open

1. Per-model prompt sections.
   A test should print the system prompt of a `claudetto:main` session.
   If gated sections appear, set `CLAUDE_CODE_BISON_CAIRN`, `CLAUDE_CODE_LARCH_CISTERN`, `CLAUDE_CODE_WILLOW_TERN`, `CLAUDE_CODE_AMBER_ASTROLABE`, `CLAUDE_CODE_BASALT_COVE`, and `CLAUDE_CODE_TURN_UPDATES` to `0`.
   The same test settles whether `CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT` can drop.
2. Whether `DISABLE_TELEMETRY`, `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`, or `DISABLE_GROWTHBOOK` turn off `tengu_plugin_hooks_modules`.
   A probe is needed before any of them is set.
3. `Glob`, `Grep`, `WebFetch`, `WebSearch`, and `TodoWrite` replace decisions depend on `research/replace-matrix.md`, which does not exist yet.
   The `CLAUDE_CODE_GLOB_*` and `CLAUDE_CODE_DISABLE_WEB_FETCH` rows follow it.
4. `CLAUDE_CODE_DISABLE_NONSTREAMING_FALLBACK=1` saves a duplicate re-send after a failed stream but trades reliability.
   The user should decide.
5. `CLAUDE_CODE_EXTRA_BODY` and `CLAUDE_CODE_REMOVE_PROMPT_STRINGS` (U) are possible fallbacks when mods do not load.
   Neither has a measured payload.
6. `CLAUDE_CODE_INLINE_TOOLS` effect on tool schema size is unknown.
   A tool-list change breaks the cache, so it needs a probe.
7. `CLAUDE_CODE_DISABLE_PROACTIVITY` has an unknown cost. `SLASH_COMMAND_TOOL_CHAR_BUDGET` needs the skill list measured first.
8. `CLAUDE_CODE_TOTAL_TOKENS_REMINDER=off` and `CLAUDE_CODE_TODO_REMINDER_MODE=off` assume `claudetto:main` does not need the nudges.
   A paired run on a long task should check for drift.

## Review by the Main Session

The main session checked the undocumented and risky rows against the docs rows on 2026-10-21 (`grep` of `claude-code-docs/docs/configure/env-vars/`).

- `CLAUDE_CODE_ATTRIBUTION_HEADER`: change to open. The block is `system[0]`, the `x-anthropic-billing-header` line (`docs/prompts/agent-main.md`, "Full Text"). It has no cache marker, so its removal does not help the cache, and its effect on the billing of a subscription is not known. The stub probe `attr0` shows that its removal saves 103 characters, so keep the default (`research/probes.md`).
  Keep the default, because the saving is 103 characters.
- `CLAUDE_CODE_PLAN_V2_AGENT_COUNT`, `CLAUDE_CODE_PLAN_V2_EXPLORE_AGENT_COUNT`: keep `set 1`.
  A stub probe shows that plan mode stays active when the snippet denies `EnterPlanMode` and `ExitPlanMode`, and that the default is `Launch up to 3 Explore agents` (`research/probes.md`, `plandeny`).
- `CLAUDE_CODE_MEMORY_SUBAGENT_APPEND`: keep `set 1` on trial. The docs row says that a print-mode probe showed no visible effect (`agents-and-teams.md:73`), so the eval must show a change, or the row goes.
- `CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS` and `includeGitInstructions: false` are one switch. The snippet sets only one of them, and `p2-settings-perms-cli.md` names which.
- `CLAUDE_CODE_TOTAL_TOKENS_REMINDER=off`: confirmed in this session. Each turn carries a `total_tokens` reminder.
