# Setup Requirements

## Prompt Commands And Local Commands

- [ ] **REQ-SETUP-004** claudetto shall answer a bare `/statusline` from a Mod `skill.prompt` text of 323 chars, so no subagent run starts.
  Acceptance: bare `/statusline` takes 32 ms and 0 tokens (file route 3.99 s and 55,376 tokens); no `statusline-setup` Agent call is made, since with `amod` withholding `statusline-setup` the baseline pass-through gives "Agent type 'statusline-setup' not found". Verification: probe.
  Basis: measured, claude 2.1.318. The stock text is 90 chars and its first subagent request alone is 20,234 bytes. Status: partial at 088a227c (`STATUSLINE_DESCRIPTION` and `statuslineEdit` in the setup feature; no `/statusline` override found in the surface feature). The hook name `skill.prompt` exists in 2.1.326 (chunk-dafpvz32.js@4253 (2.1.327)).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2966; plugins/claudetto/hooks/features/setup/setup.ts:38@088a227c.

## Settings Values

- [x] **REQ-SETUP-007** claudetto shall leave `totalTokensReminder`, `totalTokensReminderBudget`, `breakReminder`, `quietHours`, and `policyHelpers` unset, and shall write `totalTokensReminder` "off" if it writes the reminder at all.
  Verified: grep, claude 2.1.327, 2026-11-18, `grep -rnE "totalTokensReminder|breakReminder|quietHours|policyHelpers" plugins/claudetto --exclude-dir=types`: 0 hits, so no plugin code writes any of them.
  Acceptance: no such key in the written settings, or `totalTokensReminder` "off". Verification: inspection.
  Basis: cited. `totalTokensReminder` takes off, infinite, fixed, countdown, padded-countdown (default padded-countdown with the capability, else off); `totalTokensReminderBudget` is an integer, unset; `totalTokensReminderAfterUserTurn` false is valid; `breakReminder` is opt-in, unset or `{"enabled": false}`. Status: missing at 088a227c (no match for these keys under plugins).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:793.

- [x] **REQ-SETUP-008** claudetto shall set `showClearContextOnPlanAccept` true and leave `plansDirectory`, `bashEditDiffEnabled`, `respondToBashCommands`, `askUserQuestionTimeout`, and `dialogExpiry` unset.
  Acceptance: the written settings hold `showClearContextOnPlanAccept: true` and none of the five other keys. Verification: inspection.
  Basis: cited, by the user's rule that a default-off feature stays unset; the defaults are in section 3. Status: partial at 088a227c (`settings.ts:172` sets `showClearContextOnPlanAccept: true`; the five keys appear nowhere in plugins).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:732; plugins/claudetto/hooks/features/setup/settings.ts:172@088a227c.
  Verified: probe, claude 2.1.327, 2026-11-18, `claude -p hi --plugin-dir plugins/claudetto` with a temp CLAUDE_CONFIG_DIR: settings.json gained `showClearContextOnPlanAccept: true`; the five keys appear nowhere in hooks/settings/defaults.ts@abed830ed.

## Builtin Disable

- [ ] **REQ-SETUP-010** claudetto shall keep the builtin ids that the supported Claude Code build registers in one constant (13 on 2.1.327; 14 on 2.1.325 and 2.1.326, which also registered `cc-plugin-claude-test`), and diff it against the registration list on each Claude Code release.
  Acceptance: one constant holds the ids; a release check fails when the registration list differs from it. Verification: test.
  Basis: cited. Status: partial at 088a227c (one constant of 11 ids, `plugins/claudetto/hooks/features/setup/settings.ts:64`).
  Source: plugins/claudetto/hooks/features/setup/settings.ts:64@088a227c; chunk-dafpvz32.js@80491 (2.1.327; first read in claude 2.1.326 binary: the builtin registry `builtinPlugins`, ids `<name>@builtin`, enabled from settings `enabledPlugins`; the 2.1.325 citation was chunk-yjs2ay06.js@72522, `yY()` registers 14); chunk-syz79m2z.js@450-1844 (2.1.327: 13 registrations, no `cc-plugin-claude-test`; see CTX-440).

- [x] **REQ-SETUP-011** claudetto shall, at session start, read user settings and write `false` for any id in the REQ-SETUP-010 constant that is not `false`, then tell the user to run `/reload-plugins` (interactive) or restart (headless).
  Acceptance: after a drift, user settings hold `false` for every id in the constant and the user sees the notice; a launch after the write loads no builtin. The ids include `cc-plugin-privacy@builtin`. Verification: probe.
  Basis: user decision, 2026-11-16; measured. Status: partial at 088a227c (settings.ts:63-77 `BUILTIN_PLUGINS_OFF` lists 11 ids and no `cc-plugin-privacy@builtin`; no session-start drift repair; `git grep -n privacy 088a227c -- plugins` finds no privacy id)
  Source: user decision, 2026-11-16; probe: cc-inspect `cli`, claude 2.1.325, a `tool.call` hook writes `<config-dir>/settings.json` before a `Skill plugin-authoring` call, 2026-11-16 (old plan); see [ADR-0057](../adr/0057-builtin-disable-in-user-settings.md); user answer through AskUserQuestion, 2026-11-16 18:04 UTC, all 14 builtins off, perl allowed with a diff hook, settings rewritten (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:5034); probe, `claude` 2.1.325, 2026-11-16, cc-inspect `cli` `--settings` with all 14 ids `false` gave `[]` (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:5290); observed in transcript, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:6352).; probe: claude 2.1.327, 2026-11-18, `CLAUDE_CONFIG_DIR=<empty dir> claude -p hi --plugin-dir plugins/claudetto --debug-file d.log` twice: the first run logged "claudetto turned off 13 builtin plugin(s)" and wrote all 13 ids `false`; the second run loaded 0 `@builtin` hooks modules

## Tool Text Keeps The Shorter Text

- [ ] **REQ-SETUP-019** claudetto shall ship its `tool.describe` text for each `TOOL_TEXTS` and `DEFERRED_TOOLS` entry only while it is shorter than the stock text (Agent is the exception: it names claudetto agents), and shall keep `ListAgents`, Read, and Write undeferred. Rarely used tools load through ToolSearch only when ToolSearch is listed.
  Acceptance: a check holds the stock length per overridden tool and fails when ours is not shorter; with `ListAgents` deferred the model said it had no tool (reach 0/8 against 8/8, p=0.0002); 8/8 after the fix. Verification: test.
  Basis: measured. Status: have at 088a227c (`plugins/claudetto/hooks/features/surface/surface.ts`, `surface/texts.ts`).
  Source: openspec/specs/surface-trim/spec.md:99; openspec/specs/surface-trim/spec.md:103; openspec/specs/surface-trim/spec.md:271; plugins/claudetto/hooks/features/surface/surface.ts@088a227c.
  Conflict: Tool Deferral.

## Settings Never Written

- [x] **REQ-SETUP-022** claudetto shall never write `disableAllHooks`, `disableSkillShellExecution`, `disableSideloadFlags`, `disableCommandPluginSources` (a key that stops its own hooks, skills, or sideloaded folder), nor any key that removes /login, /logout, /doctor, or the updater, and shall never `permissions.deny` a tool whose removal raises the request: removing ToolSearch adds 37,936 chars, Skill 8,720, and Bash saves 407 but takes the shell away. A shortened prompt piece that changes behavior on the task set is reverted and the run recorded.
  Verified: grep, claude 2.1.327, 2026-11-18, `grep -rnE "disableAllHooks|disableSkillShellExecution|disableSideloadFlags|disableCommandPluginSources|permissions" plugins/claudetto --exclude-dir=types`: 0 hits, so no plugin code writes any of them.
  Acceptance: a setup test asserts none of these keys is written and fails when ToolSearch is in `permissions.deny`, naming +37,936. Verification: test.
  Basis: measured (claude 2.1.317); corrected on 2.1.327 by a fake-API request probe (`-p` mode, temp project, bytes; baseline 47,323): deny ToolSearch +28,025 (was +37,936), deny Skill +8,855 (was +8,720), deny Bash -594 (was -407), deny Workflow, ScheduleWakeup and ReportFindings -12,823; `disableSideloadFlags` is present (chunk-ja5z738t.js@263136). Status: partial at 088a227c (`plugins/claudetto/hooks/features/setup/settings.ts`); missing as a test at 088a227c; no git grep for `disableSideloadFlags` or the +37,936 figure was run in plugins/.
  Source: openspec/specs/surface-trim/spec.md:51; openspec/specs/surface-trim/spec.md:8; openspec/specs/surface-trim/spec.md:31; openspec/specs/surface-trim/spec.md:80; openspec/changes/archive/2026-11-09-release-2-1-319/specs/surface-trim/spec.md:9.

## Setup Contract

- [ ] **REQ-SETUP-023** claudetto shall run setup inside Claude Code with no checkout, bun, or just; ask per group (Smaller prompt, Auto mode, Models and windows, Worktrees, Features off, Status line); write no key of a discarded group; leave existing user values (value shown beside the existing one, replaced only on "Replace mine too"); write nothing when the dialog is dismissed or under `claude -p`, and say so in the report; return `text` and not `context`; carry no value that states a fact of this repo; and make no percentage-of-plan-limit claim without a measurement. "Features off" writes `CLAUDE_CODE_DISABLE_ADVISOR_TOOL=1` (the built-in advisor sends the whole transcript uncached) and `env.CLAUDE_CODE_SILENT_TURN_REMINDER=0`, removes an earlier-written `CLAUDE_CODE_SILENT_TURN_REMINDER_TEXT`, and keeps a person-written text, in fill and replace modes.
  Decision: ADR-0190, silent fill-write of unset keys at SessionStart with one notice; no wizard or per-group dialog.
  Acceptance: a dismissed dialog writes nothing; returning `context` adds 48 chars to the first request (31,909 against 31,861) and `text` adds none. Verification: test.
  Basis: measured and reported. Status: have at 088a227c (`settings.ts:178` advisor, `settings.ts:188` silent turn reminder, `commands/setup.md`).
  Source: openspec/specs/setup/spec.md:161; openspec/specs/setup/spec.md:168; plugins/claudetto/hooks/features/setup/settings.ts:178@088a227c; plugins/claudetto/hooks/features/setup/settings.ts:188@088a227c.
  Conflict: Features-Off Settings.

## Sandbox Settles Shell Commands

- [ ] **REQ-SETUP-024** claudetto shall enable the built-in sandbox and write `sandbox.autoAllowBashIfSandboxed: true`, which approves sandboxed commands with no prompt and no classifier call, set `allowUnsandboxedCommands` true so a blocked command retries outside under the permission flow, and list no domains by hand. Setup text for sandbox refusals is dropped.
  Acceptance: a setup write holds `sandbox.enabled`, `autoAllowBashIfSandboxed: true`, and no hand-listed `allowedDomains`. Verification: test.
  The key is written because its default is not fixed: when unset it is the inverse of the server gate `bot_protected_tengu_compiled_pudding` (`autoAllowBashIfSandboxed ?? !gate`, chunk-1yrzf3wn.js@1116482), and the settings schema documents it as false. Unset, an account with the gate on gets a permission prompt for every sandboxed command.
  Basis: reported; default measured by code read of 2.1.327 (2026-11-18). Status: partial at 088a227c (`plugins/claudetto/hooks/features/setup/settings.ts`).
  Source: openspec/specs/sandbox/spec.md:8; openspec/specs/sandbox/spec.md:80; openspec/specs/setup/spec.md:283; chunk-1yrzf3wn.js@1116482 and chunk-ja5z738t.js@138689 (claude 2.1.327); ADR-0188.

## Setup Groups

- [ ] **REQ-SETUP-025** claudetto shall write one setup group per setting a plugin cannot write (Smaller prompt `enabledPlugins` false list, `autoMode` `$defaults`-preserving lists, `sandbox.enabled`, `defaultMode` when missing, `promptCacheTtl`), ask once per missing env key (`CONTEXT7_API_KEY`, `TYPESAFE_API_KEY`), keep every user scalar through `fill`, and show each group's reason.
  Decision: ADR-0190, silent fill-write of unset keys at SessionStart with one notice; no autoMode lists and no defaultMode write.
  Acceptance: a setup run on an empty and on a populated settings file writes each group, keeps each user scalar, and shows each group's `why`. Verification: test.
  Basis: read. Status: have at 088a227c (`settings.ts:93` `enabledPlugins`, `:101-102` `defaultMode` and `autoMode` with a `why`, `:117` `promptCacheTtl: "1h"`; `key.ts:24-25` the two env keys). Claude 2.1.327: the `promptCacheTtl` setting is present (chunk-ja5z738t.js@277237); `autoMode` is verified on 2.1.327 (chunk-ja5z738t.js@184717).
  Source: openspec/specs/setup/spec.md:207 ("Smaller prompt" group); plugins/claudetto/hooks/features/setup/settings.ts:93-117@088a227c; plugins/claudetto/hooks/features/setup/key.ts:24-25@088a227c. Not located: the setup decisions 8-9 text itself.
  Conflict: Auto Mode.

- [ ] **REQ-SETUP-027** claudetto shall write the env group: `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH`="1" (a depth-1 subagent loses `Agent`; no mod counts spawns); `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` by plan (3 on Pro, 4 on Max, none on Ultra); `CLAUDE_CODE_DISABLE_CRON=1` (keeps `/loop` off because each fire resends the whole context, `/goal` on, polling through Monitor); `CLAUDE_CODE_DISABLE_ADVISOR_TOOL`; `worktree.baseRef` head.
  Acceptance: each key is in the written settings for its plan. Verification: test.
  Basis: measured. Status: have at 088a227c (hooks/features/setup/settings.ts, hooks/features/setup/changes.ts).
  Source: openspec/specs/setup/spec.md:303; openspec/specs/setup/spec.md:276.

- [ ] **REQ-SETUP-028** claudetto shall never set `autoMode.classifyAllShell` true (it suspends every Bash allow rule and sends each command to the classifier) and keep calls off the classifier through narrow allow rules: refuse `Bash(*)` and `Bash(python*)`; ship `Bash(git status *)`, `Bash(git diff)`, `Bash(git log)`, `Bash(git show)`; keep the user's own list whole. Do not claim auto mode drops broad rules on entry (the permission-modes page does not state it). Lists replace the built-ins with no `$defaults` only on recorded approval (classifier request 140,281 to 63,413 chars). The "Auto mode" group has one hard rule (Data Exfiltration), 11 soft rules each with a `must name` slot, 7 allow and 4 trust entries; soft rules end with `Any Other Danger`, because the client names a blocked rule only when the server cites a `soft_deny` entry.
  Decision: ADR-0190, no autoMode lists are written.
  Acceptance: `git diff --output=F HEAD~1`, `git log -1 --output=F` and `git show --output=F HEAD` exit 0 and write F, and `git status --output=F` exits 129; one classifier request carries `system[1]` of 140,015 chars on 2.1.314 and 141,962 on 2.1.317, against 46,084 for each of the first three requests. Verification: test.
  Basis: measured. Status: have at 088a227c (plugins/claudetto/hooks/features/setup/settings.test.ts asserts `classifyAllShell`).
  Source: openspec/specs/low-hitl/spec.md:69; openspec/specs/setup/spec.md:243.

- [ ] **REQ-SETUP-029** claudetto shall write a "Models and windows" group: `model` Opus 5.5 at `effortLevel` medium, `fallbackModel` Sonnet 5.5, `modelSettings` with a `maxEffortLevel` per model, `idleCompaction` false, the default-model env vars, and `autoCompactWindow` for Haiku 5.5 only; no top-level `autoCompactWindow` and no `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`.
  Decision: ADR-0190, no model or effort values; vanilla resolves the aliases to the 5.5 ids.
  Acceptance: `modelSettings["claude-haiku-5-5"].autoCompactWindow` is 100000 and no other model has a window. Verification: test.
  Basis: measured. Status: have at 088a227c (hooks/features/setup/settings.ts; groups.test.ts:92).
  Source: openspec/specs/setup/spec.md:267; openspec/specs/setup/spec.md:272; openspec/specs/tier-profiles/spec.md:32.
  Conflict: Settings Values (first item).

## Setup Fallback When Hooks Do Not Run

## Deny A Tool Name As A Size Lever

- [x] **REQ-SETUP-033** claudetto shall deny eight tools by name in `permissions.deny`, which removes each definition from the request: Workflow, ScheduleWakeup, ReportFindings, CronCreate, CronDelete, CronList, EnterPlanMode, ExitPlanMode (on 2.1.311 denying the first three took the first request from 42,676 to 30,510 chars, 12,166 = three definitions; on 2.1.312 from 42,879 to 30,713). A deny of an absent tool is dropped unless the real login shows it; no mod answer removes a built-in tool and `settings.read` does not reach permission rules. The surface-trim purpose is CLI and TUI only: turn off claude.ai, web, mobile, cloud, and onboarding surfaces by setting, env, or deny by name. Built-in agents go off with `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS=1`; the old `permissions.deny Agent(<name>)` is dropped by the 2.1.323 change.
  Acceptance: The first request lacks the eight tool definitions. Verification: probe.
  Basis: measured. Status: have at 088a227c. Claude 2.1.327: `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS` is present (chunk-2ew0jg68.js@10909); on 2.1.327 the eight-tool deny removes 12,857 bytes from a `-p` request (fake-API probe); EnterPlanMode and ExitPlanMode are already absent in `-p` mode, so six of the eight were confirmed removed.
  Source: openspec/specs/surface-trim/spec.md:48; openspec/specs/surface-trim/spec.md:147; plugins/claudetto/hooks/features/surface/trim.ts:3-7@088a227c.
  Verified: probe, claude 2.1.327, 2026-11-18, fake API on :18431: after the fill the next `-p` request held 9 tools and 31,781 bytes, the seven denied tools absent (abed830ed). Revised: ExitPlanMode stays allowed, because a plan the user starts with shift-tab is presented through it, so seven tools are denied.

## Temp Folder Rule

- [ ] **REQ-SETUP-034** claudetto shall allow writes under `/private/var/folders` (per-user temp and cache, `getconf DARWIN_USER_TEMP_DIR`; tools ignore `$TMPDIR`; 85 refusals recorded) and deny `xcrun_db*` there; globs work in `denyWrite`, not `allowWrite`. Absolute scratch paths are identical in sandboxed and unsandboxed modes (`$TMPDIR` is `/tmp/claude-501` inside and `/var/folders/...` outside: `cp` failed and chained edits were skipped).
  Acceptance: The written `sandbox` group holds `/private/var/folders` in `allowWrite` and `xcrun_db*` in `denyWrite`. Verification: inspection.
  Basis: measured. Status: missing at 088a227c.
  Source: plugins/claudetto/hooks/features/setup/settings.ts:211@088a227c (no `var/folders` in plugins/); openspec/specs/sandbox/spec.md:164.

## Setup Rules To Keep

- [ ] **REQ-SETUP-035** claudetto shall have setup write what plugins cannot: trimmed `autoMode` lists keeping `$defaults` first (extension lists read only from user, `--settings`, managed), `sandbox.enabled`, worktree settings, `promptCacheTtl` 1h, and only a MISSING `permissions.defaultMode: auto` (user settings only; without it 1-3 denials per 5-call probe and workers leave fixes uncommitted); `fill` keeps user scalars, only merged lists bypass fill. Setup installs missing tools: ast-grep (optional), betterleaks (required), mo of Mole (required): with brew it shows the exact install command and runs it only on Yes, reports exit code and stderr; with no brew it runs nothing and names the releases page; a No on an optional tool is recorded, a No on a required tool records nothing; it adds the project git root to `~/.config/mole/purge_paths`. Haiku explains each setup question (question, betterleaks-redacted, plus options give `{"pick","why"}`); a valid pick ends with `Recommended: <pick>. <why>` and moves first.
  Decision: ADR-0190, silent fill-write of unset keys at SessionStart with one notice; no autoMode lists and no defaultMode write.
  Acceptance: Setup writes the listed settings and offers each tool install as stated. Verification: test.
  Basis: measured. Status: have at 088a227c.
  Source: openspec/specs/setup/spec.md:92; openspec/specs/setup/spec.md:115; plugins/claudetto/hooks/features/setup@088a227c. The input text was cut after "invalid/empty/no answer/scan fa"; the fallback rule is not recorded here.
  Conflict: Auto Mode.

## Statusline Edit Text

- [ ] **REQ-SETUP-036** claudetto shall name the settings file in the `/statusline` edit text under `CLAUDE_CONFIG_DIR` when it is set, and under HOME otherwise, so the model edits the file that bare `/statusline` writes.
  Acceptance: the lab case "the /statusline edit text names settings.json under CLAUDE_CONFIG_DIR, else under HOME" passes; a paid TUI run on `claude-haiku-5-5` with `CLAUDE_CONFIG_DIR=evidence/tmp/probe-sl/cfg` read `evidence/tmp/probe-sl/cfg/settings.json` (about 21k tokens, $0.0044). Verification: test.
  Basis: measured. Status: have at 088a227c.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:145; plugins/claudetto/hooks/features/setup/setup.ts:243@088a227c; plugins/claudetto/hooks/features/setup/text.ts:25@088a227c.

## Setup Speed

## Sandbox Proxy

- [ ] **REQ-SETUP-039** claudetto shall set up the sandbox so that every tool that needs the network proxy reaches it, with one general setting and no per-tool variable such as one for Java.
  Acceptance: after setup, Gradle, gh, and a second non-Java tool pass through the sandbox proxy with no tool-specific option. Verification: test.
  Basis: reported, user. Status: missing at 088a227c (`git grep -n -i "proxy" 088a227c -- plugins` finds no sandbox proxy setting)
  Source: reported, user, 2026-11-13; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:14535.

## Surface Trim

- [ ] **REQ-SETUP-040** claudetto shall drop unused tools at `tool.list` (Workflow, ScheduleWakeup, ReportFindings, NotebookEdit, DesignSync, RemoteTrigger, EnterPlanMode, ExitPlanMode, cron, TodoWrite) and set `disableWorkflows`, `disableBundledSkills`, `disableClaudeAiConnectors` and `skillListingMaxDescChars` 60 at `settings.read` (a user-set value wins); the `keptTools` userConfig returns any tool. A `settings.read` deny does NOT remove a tool, and no mod answer removes a built-in tool, so setup also denies Workflow, ScheduleWakeup, ReportFindings, CronCreate/Delete/List, EnterPlanMode, ExitPlanMode through `permissions.deny`.
  Acceptance: Measured: tools array 28,455 -> 8,123 chars (12 -> 8 tools), messages 8,595 -> 3,027; denying Workflow+ScheduleWakeup+ReportFindings cut the first request 42,676 -> 30,510 chars on 2.1.311 (42,879 -> 30,713 on 2.1.312); connectors off verified live; `enableWorkflows:false` and `disableWorkflows:true` give byte-identical requests (37,066 chars). Verification: test.
  Basis: measured. Status: have at 088a227c (surface.ts keptTools, trim.ts:19-24). Claude 2.1.327: the settings `disableClaudeAiConnectors` (chunk-ja5z738t.js@161646) and `skillListingMaxDescChars` (chunk-ja5z738t.js@230906) and the hooks `tool.list` and `settings.read` (chunk-dafpvz32.js@3087, @3643) are present; on 2.1.327 `disableWorkflows` (chunk-ja5z738t.js@247628), `enableWorkflows` (@248694), and `disableBundledSkills` (@242447) are present, and the tool names are in the tool list (chunk-1vttvse2.js).
  Source: openspec/changes/2-1-325-rearchitecture/design.md:15; openspec/specs/surface-trim/spec.md:48; openspec/specs/surface-trim/spec.md:253; openspec/specs/surface-trim/spec.md:60; plugins/claudetto/hooks/features/surface/trim.ts:24@088a227c.

## Tool Text Shortening

- [ ] **REQ-SETUP-041** claudetto shall shorten `tool.describe` texts to at most 200 chars for Monitor, ToolSearch, EnterPlanMode and ExitPlanMode (stock 953-6,354) and TaskCreate/Get/List/Update from 6,119 to 1,597 chars, keeping the listed semantics; the schema stays untouched. The Monitor text says a notice is not the user's reply; the command prints only lines to act on, failures included; one notice = `Bash` with `run_in_background`; run the writer in the command since `tail -F` never ends after its writer exits. claudetto defers none of these (the engine defers Monitor and the plan-mode tools; ToolSearch stays loaded). The `Agent` description tells the model to set `isolation: "worktree"` for an agent that commits; no agent definition sets `isolation`.
  Acceptance: Each shortened text keeps status values, blocks/blockedBy, null-delete of a metadata key, deleted-as-removal, read-before-update and complete-only-when-done. Verification: test.
  Basis: measured. Status: have at 088a227c (surface/texts.ts, `TOOL_TEXTS`, holds a Monitor text). Claude 2.1.327: the hook `tool.describe` is present (chunk-ecn8g7cy.js@2524) and Monitor ships as `MonitorTool` (chunk-1vttvse2.js@204447: the name differs); on 2.1.327 `tool.describe` is present (claude-code.d.ts@228286), the model-facing name in a live request is `Monitor` (internal `MonitorTool`), and the other tools are in the tool list (chunk-1vttvse2.js).
  Source: openspec/specs/surface-trim/spec.md:353; openspec/specs/surface-trim/spec.md:369; openspec/specs/surface-trim/spec.md:379; openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:856; plugins/claudetto/hooks/features/surface/texts.ts:20@088a227c.

## Setup Env Flags

- [ ] **REQ-SETUP-043** claudetto shall have setup write 16 approved env flags plus `CLAUDE_CODE_THRIFTY_SONIC=0` (flagged unofficial, with its source in code) and `CLAUDE_CODE_DISABLE_ADVISOR_TOOL=1` in Features off, so the advisor stays disabled.
  Acceptance: An empty settings file ends with all 17 env names. Claude 2.1.327: `CLAUDE_CODE_THRIFTY_SONIC` (chunk-2ew0jg68.js@19283) and `CLAUDE_CODE_DISABLE_ADVISOR_TOOL` (chunk-2ew0jg68.js@9810) are present. `OFF_SKILLS` duplicates `disableBundledSkills`. Verification: test.
  Basis: measured. Status: have at 088a227c (settings.ts:178,197).
  Source: openspec/specs/surface-trim/spec.md:280; openspec/specs/decide/spec.md:227; plugins/claudetto/hooks/features/setup/settings.ts:178@088a227c; plugins/claudetto/hooks/features/setup/settings.ts:197@088a227c; user decision, 2026-11-14 02:35 UTC, the Advisor tool goes if it cannot be cache-aligned (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:30659).

## Version Floor

- [x] **REQ-SETUP-044** claudetto shall carry one version constant: each `plugin.json` `engines["claude-code"]` = `">=2.1.327"` (revised 2026-11-18: the `minimumVersion` settings write is out, because it only stops downgrades on the stable channel, chunk-ja5z738t.js@285180); no hook or mod checks the running version; claudetto runs `claude plugin validate` for the type check of a TypeScript hooks module.
  Verified: grep and plugin validate, claude 2.1.327, 2026-11-18, `claude plugin validate plugins/claudetto` passes (warning: no marketplace install line in the README) and plugin.json holds `engines["claude-code"]` ">=2.1.327"; the `minimumVersion` write is dropped (it only stops downgrades on the stable channel, chunk-ja5z738t.js@285180) and no hook checks the version.
  Acceptance: Fill mode keeps a user value (even higher); replace mode overwrites. Claude Code refuses git/remote install below the floor with `claude update` advice; local or `--plugin-dir` installs load with a note (`>=9.0.0` still loaded under `--plugin-dir`, prediction failed). On 2.1.327 a probe confirms the local case: `plugin install q@mk` with engines `>=9.0.0` loaded with the note "needs Claude Code >=9.0.0, this is 2.1.327, but loads anyway because it's read from a local folder". The refusal for git or remote sources is verified in code only (message chunk-dfwkett1.js@7698; checks chunk-m14bt1pz.js@949377, @950266) and was not run. Verification: test; probe.
  Basis: reported; measured. `minimumVersion` gives no warning and only guards updates (probe 2.2); the setting `requiredMinimumVersion` exits at startup when older, which `minimumVersion` is not (present in 2.1.326: chunk-ja5z738t.js@285180 (2.1.327); `minimumVersion` is present on 2.1.327 at chunk-ja5z738t.js@285052, `requiredMinimumVersion` at @285180). Replaces the earlier floor 2.1.316-2.1.318 with a SessionStart `source=startup` `$.ui.log` warning when running below the floor (none on resume; removed as "Warn Once at Start"). A spec Purpose still says 2.1.316 while requirements say 2.1.323: stale prose. Status: have at 088a227c (settings.ts:19 MINIMUM_VERSION, :146; plugins/*/.claude-plugin/plugin.json hold engines >=2.1.323 in all 3).
  Source: openspec/specs/version-floor/spec.md:8; openspec/specs/version-floor/spec.md:27; openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1454; openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:768; plugins/claudetto/hooks/features/setup/settings.ts:19@088a227c; external/2026-11-16/reddit.com-r-claudecode-comments-1xvw576-claude-code-21323-experimental-20261114T144303Z.md:23 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xvw576/claude_code_21323_experimental_code_mode_claude/>); openspec/changes/archive/2026-11-16-2-1-323/design.md:30.

## Pinned Tool Versions

- [x] **REQ-SETUP-047** claudetto shall not hard-code tool versions in setup's list (`Tool.version`, `SCANNER_VERSION`); only the Claude Code floor stays pinned.
  Verified: grep, claude 2.1.327, 2026-11-18, `grep -rnE "SCANNER_VERSION" plugins/claudetto --exclude-dir=types`: 0 hits, so no plugin code writes any of them.
  Acceptance: git grep SCANNER_VERSION finds no hit. Verification: inspection.
  Basis: cited. Status: have at 088a227c (git grep SCANNER_VERSION finds no hit).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:382@088a227c9^ (task 18.39, the cleanup tool `mo` pinned at 1.68.0 in the tool list).

## Alias Pinning

- [x] **REQ-SETUP-053** claudetto shall write `ANTHROPIC_DEFAULT_MODEL`, `ANTHROPIC_DEFAULT_OPUS_MODEL`, `ANTHROPIC_DEFAULT_SONNET_MODEL`, and `ANTHROPIC_DEFAULT_HAIKU_MODEL` as full 5.5 IDs, so default, opus, sonnet, haiku, opusplan, and an agent's `model:` alias never resolve to an older model.
  Verified: fake-API probe, claude 2.1.327, 2026-11-18, cc-inspect `cli -p hi` with --model opus, sonnet, haiku and no flag (key login), and no flag and --model opusplan (oauth login): the request body model is claude-opus-5-5, claude-sonnet-5-5, claude-haiku-5-5, claude-opus-5-5, and claude-sonnet-5-5 for both oauth runs. Vanilla already resolves the aliases to 5.5; the oauth login resolved the default to sonnet, so a Max login was not probed.
  Acceptance: the written settings hold all four keys with 5.5 IDs. Without the pin the picker showed "Default (recommended) Opus 5" and `opusplan` named claude-opus-5. Verification: test.
  Basis: measured. Status: have at 088a227c.
  Source: openspec/specs/tier-profiles/spec.md:159; plugins/claudetto/hooks/features/setup/settings.ts:120@088a227c.

## Classifier Model

## Output Limits

- [ ] **REQ-SETUP-055** claudetto shall write `bashOutputMaxChars: 8000` and `env.MAX_MCP_OUTPUT_TOKENS: "10000"`, so Claude Code truncates and the plugin cuts nothing. A tool result bound of 12,000 chars keeps whole lines to the limit and ends with a count of lines not shown.
  Acceptance: both keys are written; `MAX_MCP_OUTPUT_TOKENS` sits in `env` because it is read from process env. Measured: a 20,000-char Bash print gives a 2,258-char preview plus a path to saved output; `MAX_MCP_OUTPUT_TOKENS=2000` cut a 40,000-char MCP result. At a 10,000 cap on 2.1.327 (fake API, reports/2026-11-18-research/handover-probes/mcp-spill/): 20,000 chars entered whole, 60,000 chars sent a token-count request first, and 200,000 chars became a file notice that asks the model to read the whole file. Verification: test.
  Basis: measured (2.1.323 research probes); cited (Claude Code warns on an MCP result past 10,000 tokens). Status: have at 088a227c.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/inventory.md:57; plugins/claudetto/hooks/features/setup/settings.ts:137@088a227c.

## Env Keys

- [ ] **REQ-SETUP-056** claudetto shall write `CLAUDE_ASYNC_AGENT_STALL_TIMEOUT_MS` "900000" (it counts silence, not run time) and no `CLAUDE_CODE_SCRIPT_CAPS` (it counts substrings of Bash commands and acts only with `CLAUDE_CODE_SUBPROCESS_ENV_SCRUB`, which forces default permission mode).
  Acceptance: the written env holds the stall timeout and no script caps key. Verification: test.
  Basis: measured. Status: have at 088a227c.
  Source: openspec/changes/archive/2026-11-13-feat-2-1-321/specs/setup/spec.md:25; plugins/claudetto/hooks/features/setup/settings.ts:183@088a227c.

## Surface Control

- [ ] **REQ-SETUP-057** claudetto shall override, trim, or disable what it can, such as built-in skills and claude.ai connectors, while keeping capabilities and user control.
  Acceptance: each surface left on shows a measured value. Verification: inspection.
  Basis: user decision, 2026-11-14. Status: partial at 088a227c (features/setup, the `@builtin` disable).
  Source: user decision, 2026-11-14 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:12); user decision, 2026-11-14 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:459).

- [ ] **REQ-SETUP-058** claudetto shall remove the permission nagging that the Claude Code sandbox brings, through supported configuration and carefully scoped human approval, and shall keep its own settings in the style of Claude's settings.json key-value conventions.
  Acceptance: a normal run raises no avoidable permission prompt. Verification: demonstration.
  Basis: user decision, 2026-11-14. Status: partial at 088a227c.
  Source: user decision, 2026-11-14 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:12); user decision, 2026-11-14 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:459).

## Auto Mode

## Conflicts With Settled Decisions

- [ ] **REQ-SETUP-062** claudetto shall write in the "Smaller prompt" group `disableBundledSkills: true`; `outputStyle: claudetto:Concise`; `enabledPlugins` false for ten `cc-plugin-<name>@builtin` (agents-md, plugin-authoring, mods-guide, tips, mermaid, responsive-mode, diff, you-should-know, easel, claude-test); `permissions.deny` of eight tools; and `permissions.allow` of four read-only git rules. It shall not write `cc-plugin-claude-platform@builtin`, but claude 2.1.327 does ship that plugin: it is registered as `claude-platform` without the `cc-plugin-` prefix, gated by a condition, a feature flag, and login (chunk-syz79m2z.js@800-1844; chunk-5hejrm7d.js@22716; chunk-g8aab327.js@582); a search finds no `cc-plugin-claude-platform`. The "no longer ships" claim is false; the requirement to not write it stays, under the id `claude-platform`. Each `@builtin` gets a disable enforced at runtime, because a `settings.read` `enabledPlugins` false did not stop the built-ins and only `--settings` did.
  Acceptance: an empty settings file after the group holds the ten ids, eight denies, four allows; a session with `claude plugin list` shows no built-in loaded. Verification: test.
  Basis: reported and measured. Status: have at 088a227c (`plugins/claudetto/hooks/features/setup/settings.ts`).
  Source: openspec/specs/setup/spec.md:205; openspec/specs/setup/spec.md:207; openspec/changes/archive/2026-11-16-2-1-323/tasks.md:102; openspec/changes/2-1-325-rearchitecture/design.md:81.
  Conflicts with: all 14 builtins disabled, `privacy` included, enforced by rewriting user settings at session start (user decision, 2026-11-16).

## Silent-Turn Reminder

- [ ] **REQ-SETUP-063** claudetto shall write `CLAUDE_CODE_SILENT_TURN_REMINDER: "0"` in the Features-off env, write no `_TEXT` key, and unset a retired `_TEXT` value that setup wrote earlier, in fill mode too, keeping a text the user wrote.
  Acceptance: a rerun removes each old reminder text and keeps a user text. Verification: test.
  Basis: user decision. Status: have at 088a227c (groups.test.ts:126 expects `CLAUDE_CODE_SILENT_TURN_REMINDER: "0"`, :128 expects no `_TEXT` key)
  Source: user decision, 2026-11-14 (date of the handoff that records it; day of decision not recorded) (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/294da1a9-e778-41e2-b2d4-d83e20be999a.jsonl:1241).

## Sandbox

- [ ] **REQ-SETUP-064** claudetto shall write the sandbox block of REQ-GUARDS (deny-list) in setup, with `withCacheDirs` and `cacheDirs` removed.
  Acceptance: see the guards item. Verification: inspection.
  Basis: user decision. Status: have at 088a227c (groups.test.ts:158 sandbox group writes `sandbox: { enabled: true }`; `git grep -n withCacheDirs 088a227c -- plugins` finds none)
  Source: user decision, 2026-11-13 22:08 UTC, sandbox trimmed to unrecoverable destructive commands (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:14708); user decision, 2026-11-14 14:21 UTC, sandbox as minimal as possible (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:36547).

- [ ] **REQ-SETUP-065** claudetto shall ask the user once whether to turn auto memory off, state the measured saving of 755 tokens per first request, and write `autoMemoryEnabled: false` only on a yes.
  Decision: ADR-0190, auto memory is not written; REQ-GUARDS-048 requires consent.
  Acceptance: a setup run with a no answer or no reply leaves `autoMemoryEnabled` unset; a yes writes the key; the question text holds the 755-token figure from CTX-671. Verification: test.
  Basis: reported (one user says memory files duplicate docs and can contradict the project; five comments describe agents hoarding self-written memories, one repo with 89, misattributed to the user and followed rigidly; three comments call memory files an anti-pattern for code; no measurement of harm). Status: missing at 088a227c.
  Source: external/2026-11-18/reddit.com-r-claudecode-comments-1xywg7f-memories-and-rules-20261117T224544Z.md:27,39-54 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xywg7f/memories_and_rules/>); reports/2026-11-18-research/dossier.md:173,174,185. Consent rule: REQ-GUARDS-048.
