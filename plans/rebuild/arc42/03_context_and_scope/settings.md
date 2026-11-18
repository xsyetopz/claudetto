# Settings

## Settings and Switches

- [ ] **CTX-002** `CLAUDE_AGENT_SDK_DISABLE_BUILTIN_AGENTS` changes nothing in the interactive TUI, and `permissions.deny` `Agent(Explore)` removes the Explore listing line there.
  Basis: measured, claude 2.1.318, interactive probe run by the user in Terminal (run 4): L3c body 55,890 bytes equals the L3e control with Explore listed; deny `Agent(Explore)` gives 55,394 bytes, 496 less. The earlier -1,544 bytes applies to `-p` only.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1731; openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1773; openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1781.

- [ ] **CTX-003** A piped stdout makes `claude` run as `-p` (`cc_entrypoint` is `sdk-cli`, not `cli`). Interactive mode accepts `ANTHROPIC_API_KEY` only when its last 20 characters are in `customApiKeyResponses.approved`, and the TUI asks "Detected a custom API key"; `-p` does not ask. The interactive TUI maps and offers agents as `-p` does: a Mod offered only `dmap:Artemis`, and the Explore call ran the Artemis prompt (runs i0 and j5c2, fake API, claude 2.1.318). The TUI starts in auto mode by default, no settings key sets it, so a probe needs `permissions.defaultMode` `default`.
  Basis: measured (the `-p` and API-key notes were first reported, claude 2.1.318 probe notes).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1731; openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2348.

## Settings and Switches

- [ ] **CTX-004** `plansDirectory` default is `~/.claude/plans` (user home); `bashEditDiffEnabled` default is off, on in auto and bypass modes; `respondToBashCommands` default is true and false skips the whole request (read in the binary, not run); `askUserQuestionTimeout` unset means it never auto-answers; `dialogExpiry` default is 5m; `showClearContextOnPlanAccept` default is false; `disableBundledSkills` equals `CLAUDE_CODE_DISABLE_BUNDLED_SKILLS=1`.
  Basis: cited, clawdipedia settings schema and binary read as the source states (Claude Code 2.1.316 schema).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:732.

## Settings and Switches

- [ ] **CTX-005** Probes 2.1 and 2.1a on `2.1.318` in `-p` mode: a `settings.read` hook changes only `disableBundledSkills` and `outputStyle` of the measured tier keys. A plugin's own `settings.json` carries `subagentStatusLine`
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/proposal.md:13; openspec/changes/archive/2026-11-09-release-2-1-319/design.md:11.

- [ ] **CTX-006** A canary probe: an invalid value still leaves the rest of the file applied, so zero rows prove the file loaded, not that the value was valid
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1379.

- [ ] **CTX-007** `agent` "general-purpose" gives 0 chars. `-p` applies the `agent` setting (a canary agent replaced the system text, 8,480 to 173 chars). Built-in `Explore` keeps the system text and drops Agent, Edit, Write (-8,503). A nonexistent agent name gives 0 with empty stderr, so a typo is ignored silently
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1406.

- [ ] **CTX-008** Managed-only keys (`deniedModels`, `requiredMinimumVersion`, `allowedProviders`, `modelPricing`, `disableSideloadFlags`, `strictPluginOnlyCustomization`, and others) gave +0 from `--settings` and the run started, so a claudetto user file gains nothing from them. Proposed unset: `prependPlugins`, `appendPlugins`, `disableReplyCheck`, `modelPricing`
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1453.

- [ ] **CTX-009** `availableModels ["claude-sonnet-5-5"]` with `--model claude-haiku-5-5` sent the request to `claude-opus-5-5` silently (system text -2,576 chars). A model outside the list falls back to the Default, not a listed one. Proposed: list all three -5-5 models or set `enforceAvailableModels` true
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1474.

- [ ] **CTX-010** `tlsTerminate {}` is -2 chars (no request text). `forceLoginMethod`, `forceLoginGatewayUrl`, `processWrapper`, `xaaIdp`, `policyHelpers`, `managedMcpServers`, and `pluginSuggestionMarketplaces` are all +0; `managedMcpServers` is ignored outside managed settings. Proposed: none in claudetto settings
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1441.

- [ ] **CTX-011** A batch7 sweep of 356 boolean env names set to 1: 41 change size, 7 change only fields, 3 sent no request, 311 are 0. `1` is the only value tried
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1484.

## Settings and Switches

- [ ] **CTX-012** Claude Code 2.1.318 holds 1,338 `tengu_*` server gates and no setting changes one. Seen: `tengu_quiet_pike` (default false, Bash tail preview) and `tengu_typed_pebble` (default 0, a skill budget floor)
  Basis: cited.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1662.

## Settings and Switches

- [ ] **CTX-013** About 80 settings keys leave the first request unchanged (0 chars, same fields), among them advisorModel, plansDirectory, respondToBashCommands false, autoDreamEnabled, syncClaudeAiSkills and syncClaudeAiPlugins false, fastModePerSessionOptIn, autoUploadSessions false, disableDeepLinkRegistration, askUserQuestionTimeout, enableArtifact, disableRemoteControl, teammateMode, todoFeatureEnabled, pluginSuggestionMarketplaces, feedbackSurveyRate, feedbackDrafts off or quiet, autoUpdatesChannel, enableAllProjectMcpServers, breakReminder, quietHours, and about 60 more.
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1379-1390.

- [ ] **CTX-014** sandbox.failIfUnavailable defaults to false (section 7 of the settings review). With it on, a platform without the sandbox cannot start Claude Code, which is against the user's rule, so the sandbox block shall not set it.
  Basis: measured; the rule is from the spec.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:693,1012; openspec/changes/archive/2026-11-09-release-2-1-319/specs/sandbox/spec.md:49; openspec/changes/archive/2026-11-10-release-2-1-319-1/specs/sandbox/spec.md:61.

## Settings and Switches

- [ ] **CTX-015** CLAUDE_AGENT_SDK_DISABLE_BUILTIN_AGENTS turns off the built-in agents in print mode only (non-interactive: `ye()` returns `!isInteractive`). CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS is the interactive switch. In -p the built-in agents seen are claude, general-purpose, and statusline-setup, and only the DISABLE_* env names remove them. Fake-API probe L3a: Explore=1, general-purpose=2; L3b: Explore=0, general-purpose=1. The interactive half is blocked by no pty under the sandbox.
  Basis: measured, fake API; also cited and observed.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/vanilla-research.md:63,121; openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1717.

- [ ] **CTX-016** Twelve env switches turn parts of Claude Code off, each with its gate and off-route: CLAUDE_CODE_DISABLE_WEB_FETCH, CLAUDE_CODE_ENABLE_TASKS, CLAUDE_CODE_ENABLE_TODO_TOOLS, CLAUDE_CODE_DISABLE_WORKFLOWS, CLAUDE_CODE_HARBOR_KITE=0, CLAUDE_CODE_SEND_FEEDBACK=false, CLAUDE_CODE_ENABLE_REFRESH_MCP_TOOLS, CLAUDE_CODE_BRIEF, CLAUDE_CODE_PEWTER_OWL_TOOL, CLAUDE_CODE_ATTACHMENTS_BY_PATH, CLAUDE_CODE_DISABLE_CRON, CLAUDE_CODE_DISABLE_PLUGIN_FORWARDING. The exact value of each is in the source rows.
  Basis: read. The name list is from the research rows; the prefix of each name is as the rows write it, which the gap line abbreviated.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/vanilla-research.md:21,61,62,100,102-105,109,119.

- [ ] **CTX-017** permissions.disableAutoMode set to "disable" is the native off-switch for auto mode.
  Basis: cited (auto-mode page).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/vanilla-research.md:67.

- [ ] **CTX-018** sandbox.filesystem.disabled true drops the file wall and keeps the network wall.
  Basis: cited (sandbox page).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/vanilla-research.md:166.

- [ ] **CTX-019** allowManagedModsOnly and the routes enableArtifact, disableArtifact, and disableClaudeAiConnectors are native off-routes for mods and connectors.
  Basis: cited.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/vanilla-research.md:137-142.

- [ ] **CTX-020** permissions.blockFileToolReadsOutsideWorkingDirectories exists in 2.1.323 (related to D10.31 and task 2.7). plansDirectory must stay inside the project. ToolInfo.inputSchema and TurnDuration.waitingFor are new.
  Basis: cited, unprobed.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/cc-2-1-323.md:31,33,34.

## Settings and Switches

- [ ] **CTX-021** claudetto shall treat these as reported: `/goal` 4000-character condition limit, stop hook with fresh verifier (`/goal` 2.1.327: present; limit verified: the handler rejects a condition longer than 4000 characters with "Goal condition is limited to 4000 characters", chunk-qwykd6a6.js@1130 and chunk-v2rqpwd4.js@6685 (2.1.327); the fresh-verifier stop hook is reported); `/loop` creates a cron (CronCreate) regardless; `/loop` with Monitor beats short polling; Remote Control needs `/rc` or `claude rc` per session (2.1.327: flag `--remote-control` present; `/rc` present as alias of `/remote-control`, chunk-m14bt1pz.js:2525877); auto-mode classifier reportedly sends the whole transcript per bash call to Haiku (reported; not checkable locally because the auto-mode check runs on the server: a fake-API probe, 2026-11-18, made no classifier request and printed "Its safety check runs on the server"); Haiku reportedly dispatched for many spawned agents by default (corrected: the built-in Explore agent has `model:"inherit"`, capped at opus, chunk-m14bt1pz.js@242090 (2.1.327)); feedback prompts mostly after bad sessions, answering consents to training (reported; not checkable locally because it concerns server-side data policy); experiment id saved in session logs (reported; not checkable locally because the fake-API init reports `analytics_disabled:true` and assignments come from the server; the GrowthBook client holds `experimentId` per feature, chunk-asj6f58y.js@765365 (2.1.327)); Claude Code reading between sessions (truncated; reported); desktop auto-handoff button (reported; not checkable locally because it is a desktop app feature, not the CLI); `claude -p` flags `--max-turns` (present), `--max-budget-usd` (present), shell `timeout` wrapper; MCP Tasks and `/tasks`; API first official version drops `temperature` (cited); skill authoring guide (gerund names, one-level references, third-person description, progressive disclosure; cited secondhand); skill-creator `evals.json` vs `claude plugin eval` case folders (reported; the `claude plugin eval [target]` and `plugin eval init [name]` subcommands are present, chunk-j2hryht5.js@35035 and @39372 (2.1.327); `evals.json` was not found by string search); image billing by 28x28 patches (reported; the binary shows no patch formula, only per-model `image_limits` of 2576 px and 4784 tokens, chunk-f892tj2r.js@4532 (2.1.327); billing is server-side); cleanup: Claude Code leaves large artefacts (~1 TB tests/builds, 45 GB logs, 1.2M files across worktrees; reported); `cleanupPeriodDays` present (default 30, min 1).
  Acceptance: Reported items stay reported until re-queried. Verification: probe.
  Basis: reported. Status: unchecked: a fact about Claude Code, not code at 088a227c.
  Source: external/export-Goal and Loop - kinda the same-.jsonl:22 (url: <https://www.reddit.com/r/ClaudeCode/comments/1uaxlt6/goal_and_loop_kinda_the_same/>); external/2026-10-03/export-Any recommendations to reduce the token usage for simple tasks in a large project-.jsonl:11 (url: <https://www.reddit.com/r/ClaudeCode/comments/1wwl9a4/any_recommendations_to_reduce_the_token_usage_for/>).

- [ ] **CTX-022** `CLAUDE_CODE_DISABLE_CFC_PROMPT`, `CLAUDE_CODE_DISABLE_ADVISOR_TOOL`, `CLAUDE_CODE_THRIFTY_SONIC`, `CLAUDE_CODE_SUBAGENT_MODEL=claude-haiku-5-5` and `CLAUDE_CODE_DISABLE_FAST_MODE` each change 0 characters of the first request; all stay in setup except `CLAUDE_CODE_DISABLE_CFC_PROMPT`, removed on 2026-11-06 by the user ("it should be removed."). Read from the 2.1.319 source, it drops only the Claude in Chrome prompt section and the bundled skill, and the browser tools are unaffected; no source line expands CFC (the bundle names it only "Claude in Chrome"), so the C-F-C reading is a guess.
  Basis: measured (first-request characters); user decision (the removal).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:492; openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1330.

- [ ] **CTX-023** A commenter's claim that setting `CLAUDE_CODE_WORKFLOW_PROMPT_PROVENANCE` to `0` or `false` does not disable the framing, and an empty string did not either, was judged "rejected" as out of scope: it concerns another product, model, user workflow or private-log statistic with no plugin file to change.
  Basis: reported (n=1).
  Source: external/please-use-me-often/agent-failure-dossier/judged/setting.jsonl:78.
