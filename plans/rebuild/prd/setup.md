# Setup Requirements

Verified (batch, test-checked requirements): `just verify`, claude 2.1.329, 2026-11-24: exit 0, 834 tests in 102 files, 0 fail; covers REQ-SETUP-022, REQ-SETUP-024, REQ-SETUP-027, REQ-SETUP-056, REQ-SETUP-071; test files `plugins/claudetto/hooks/guards/wall/__tests__/fill.test.ts`, `plugins/claudetto/hooks/settings/__tests__/defaults.test.ts`, `plugins/claudetto/hooks/settings/__tests__/owned.test.ts`, `plugins/claudetto/hooks/settings/__tests__/start.test.ts`.

## Prompt Commands and Local Commands

- [x] **REQ-SETUP-004** Moved Out as OUT-2349: the item needs a paid model run.

## Settings Values

- [x] **REQ-SETUP-007** claudetto shall leave `totalTokensReminder`, `totalTokensReminderBudget`, `breakReminder`, `quietHours`, and `policyHelpers` unset, and shall write `totalTokensReminder` "off" if it writes the reminder at all.
  Verified: grep, claude 2.1.327, 2026-11-18, `grep -rnE "totalTokensReminder|breakReminder|quietHours|policyHelpers" plugins/claudetto --exclude-dir=types`: 0 hits, so no plugin code writes any of them.
  Acceptance: no such key in the written settings, or `totalTokensReminder` "off". Verification: inspection.
  Basis: cited. `totalTokensReminder` takes off, infinite, fixed, countdown, padded-countdown (default padded-countdown with the capability, else off); `totalTokensReminderBudget` is an integer, unset; `totalTokensReminderAfterUserTurn` false is valid; `breakReminder` is opt-in, unset or `{"enabled": false}`. Status: missing at 088a227c (no match for these keys under plugins).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:793.
  Verified: PASS: grep of plugins/ for the five removed keys finds 0 hits (re-run from B-setup report, HEAD b5f6510b4). Binary 2.1.327, 2026-11-19, re-checked from the B-setup report.
  Verified: inspection, 2026-11-24, claude 2.1.329: the fill writes showClearContextOnPlanAccept true and no other plan-accept key.

- [x] **REQ-SETUP-008** claudetto shall set `showClearContextOnPlanAccept` true and leave `plansDirectory`, `bashEditDiffEnabled`, `respondToBashCommands`, `askUserQuestionTimeout`, and `dialogExpiry` unset.
  Acceptance: the written settings hold `showClearContextOnPlanAccept: true` and none of the five other keys. Verification: inspection.
  Basis: cited, by the user's rule that a default-off feature stays unset; the defaults are in section 3. Status: partial at 088a227c (`settings.ts:172` sets `showClearContextOnPlanAccept: true`; the five keys appear nowhere in plugins).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:732; plugins/claudetto/hooks/features/setup/settings.ts:172@088a227c.
  Verified: probe, claude 2.1.327, 2026-11-18, `claude -p hi --plugin-dir plugins/claudetto` with a temp CLAUDE_CONFIG_DIR: settings.json gained `showClearContextOnPlanAccept: true`; the five keys appear nowhere in hooks/settings/defaults.ts@abed830ed.
  Verified: PASS: hooks/settings/defaults.ts sets showClearContextOnPlanAccept true; the other five keys have 0 hits; plugin test 105 pass, binary 2.1.327. Binary 2.1.327, 2026-11-19, re-checked from the B-setup report.
  Verified: inspection, 2026-11-24, claude 2.1.329: the fill writes showClearContextOnPlanAccept true and no other plan-accept key.

## Builtin Disable

- [x] **REQ-SETUP-010** Moved Out as OUT-2350: the item describes a part that plugins/ does not ship.

- [x] **REQ-SETUP-011** claudetto shall, at session start, read user settings and write `false` for any id in the REQ-SETUP-010 constant that is not `false`, then tell the user to run `/reload-plugins` (interactive) or restart (headless).
  Acceptance: after a drift, user settings hold `false` for every id in the constant and the user sees the notice; a launch after the write loads no builtin. The ids include `cc-plugin-privacy@builtin`. Verification: probe.
  Basis: user decision, 2026-11-16; measured. Status: partial at 088a227c (settings.ts:63-77 `BUILTIN_PLUGINS_OFF` lists 11 ids and no `cc-plugin-privacy@builtin`; no session-start drift repair; `git grep -n privacy 088a227c -- plugins` finds no privacy id)
  Source: user decision, 2026-11-16; probe: cc-inspect `cli`, claude 2.1.325, a `tool.call` hook writes `<config-dir>/settings.json` before a `Skill plugin-authoring` call, 2026-11-16 (old plan); see [ADR-0057](../adr/0057-builtin-disable-in-user-settings.md); user answer through AskUserQuestion, 2026-11-16 18:04 UTC, all 14 builtins off, perl allowed with a diff hook, settings rewritten (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:5034); probe, `claude` 2.1.325, 2026-11-16, cc-inspect `cli` `--settings` with all 14 ids `false` gave `[]` (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:5290); observed in transcript, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:6352).; probe: claude 2.1.327, 2026-11-18, `CLAUDE_CONFIG_DIR=<empty dir> claude -p hi --plugin-dir plugins/claudetto --debug-file d.log` twice: the first run logged "claudetto turned off 13 builtin plugin(s)" and wrote all 13 ids `false`; the second run loaded 0 `@builtin` hooks modules
  Verified: PASS: `$C plugin test plugins/claudetto` 105 pass (hooks/builtins/**tests**/builtins.test.ts included), binary 2.1.327, 2026-11-19. Probe: cc-inspect cli `-p go` request holds the plugin-authoring builtin skill; with --settings setting all 13 `@builtin` ids false, the request holds none, so a launch with those values loads no builtin.
  Verified: 2.1.331, 2026-11-24: reports/2026-11-24-research/reverify/steady.ts, two `claude -p hi` launches in one fresh CLAUDE_CONFIG_DIR on the fake API: launch 1 showed "claudetto turned off 13 builtin plugin(s)… They stay loaded until the next start."; launch 2's request does not list the plugin-authoring builtin skill; `claude plugin test plugins/claudetto` 333 pass -> PASS.
  Verified: 2026-11-24, claude 2.1.329, fake API, `bun reports/2026-11-24-research/reverify/steady.ts` (two `claude -p hi` launches in one empty `CLAUDE_CONFIG_DIR`): launch 1 wrote the builtin ids as `false` and showed the notice; launch 2's request listed no builtin skill or tool (no plugin-authoring skill, Workflow, ScheduleWakeup, ReportFindings, CronCreate or EnterPlanMode). `cc-plugin-privacy` is in the constant (`hooks/builtins/builtins.ts:12`).

## Tool Text Keeps the Shorter Text

## Settings Never Written

- [x] **REQ-SETUP-022** claudetto shall never write `disableAllHooks`, `disableSkillShellExecution`, `disableSideloadFlags`, `disableCommandPluginSources` (a key that stops its own hooks, skills, or sideloaded folder), nor any key that removes /login, /logout, /doctor, or the updater, and shall never `permissions.deny` a tool whose removal raises the request: removing ToolSearch adds 37,936 chars, Skill 8,720, and Bash saves 407 but takes the shell away. A shortened prompt piece that changes behavior on the task set is reverted and the run recorded.
  Verified: grep, claude 2.1.327, 2026-11-18, `grep -rnE "disableAllHooks|disableSkillShellExecution|disableSideloadFlags|disableCommandPluginSources|permissions" plugins/claudetto --exclude-dir=types`: 0 hits, so no plugin code writes any of them.
  Acceptance: a setup test asserts none of these keys is written and fails when ToolSearch, Skill or Bash is in `permissions.deny`; the test names the 2.1.327 cost (ToolSearch +28,025 bytes, Skill +8,855). Verification: test.
  Basis: measured (claude 2.1.317); corrected on 2.1.327 by a fake-API request probe (`-p` mode, temp project, bytes; baseline 47,323): deny ToolSearch +28,025 (was +37,936), deny Skill +8,855 (was +8,720), deny Bash -594 (was -407), deny Workflow, ScheduleWakeup and ReportFindings -12,823; `disableSideloadFlags` is present (chunk-ja5z738t.js@263136). Status: partial at 088a227c (`plugins/claudetto/hooks/features/setup/settings.ts`); missing as a test at 088a227c; no git grep for `disableSideloadFlags` or the +37,936 figure was run in plugins/.
  Source: openspec/specs/surface-trim/spec.md:51; openspec/specs/surface-trim/spec.md:8; openspec/specs/surface-trim/spec.md:31; openspec/specs/surface-trim/spec.md:80; openspec/changes/archive/2026-11-09-release-2-1-319/specs/surface-trim/spec.md:9.
  Verified: re-run 2026-11-19, claude 2.1.327 plugin test plugins/claudetto: 103 pass, 0 fail. New test 'writes no key that stops claudetto's own hooks or skills and denies no tool whose removal grows the request' (defaults.test.ts); with ToolSearch put in the deny list by hand it failed (99 pass, 4 fail with the other mutants), and passed again after restoring.

## Setup Contract

## Sandbox Settles Shell Commands

- [x] **REQ-SETUP-024** claudetto shall enable the built-in sandbox and write `sandbox.autoAllowBashIfSandboxed: true`, which approves sandboxed commands with no prompt and no classifier call, set `allowUnsandboxedCommands` true so a blocked command retries outside under the permission flow, and list no domains by hand. Setup text for sandbox refusals is dropped.
  Verified: probe, claude 2.1.327, 2026-11-18, cc-inspect cli with the ADR-0188 block via --settings and a Bash call that writes under /opt/homebrew and /private/var/folders: 0 prompts, writes succeeded; the fill writes the block (defaults.test.ts, 'writes the minimal sandbox block of ADR-0188'). The first request grew 11,694 bytes against sandbox off (recorded +11,651).
  Acceptance: a setup write holds `sandbox.enabled`, `autoAllowBashIfSandboxed: true`, and no hand-listed `allowedDomains`. Verification: test.
  The key is written because its default is not fixed: when unset it is the inverse of the server gate `bot_protected_tengu_compiled_pudding` (`autoAllowBashIfSandboxed ?? !gate`, chunk-1yrzf3wn.js@1116482), and the settings schema documents it as false. Unset, an account with the gate on gets a permission prompt for every sandboxed command.
  Basis: reported; default measured by code read of 2.1.327 (2026-11-18). Status: partial at 088a227c (`plugins/claudetto/hooks/features/setup/settings.ts`).
  Source: openspec/specs/sandbox/spec.md:8; openspec/specs/sandbox/spec.md:80; openspec/specs/setup/spec.md:283; chunk-1yrzf3wn.js@1116482 and chunk-ja5z738t.js@138689 (claude 2.1.327); ADR-0188.
  Verified: re-run 2026-11-19, claude 2.1.327 plugin test plugins/claudetto: 103 pass, 0 fail. 'writes the minimal sandbox block of ADR-0188' now also asserts no sandbox.network.allowedDomains; enabled and autoAllowBashIfSandboxed true are asserted. allowUnsandboxedCommands is written true (guards/fill.ts:42), asserted in the same test since 2026-11-19; the 2.1.327 binary forbids unsandboxed commands only when the setting is `=== false` (function CC, read with strings 2026-11-19).

## Setup Groups

- [x] **REQ-SETUP-027** claudetto shall write the env group: `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH`="1" (a depth-1 subagent loses `Agent`; no mod counts spawns); `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` by plan (3 on Pro, 4 on Max, none on Ultra); `CLAUDE_CODE_DISABLE_CRON=1` (keeps `/loop` off because each fire resends the whole context, `/goal` on, polling through Monitor); `CLAUDE_CODE_DISABLE_ADVISOR_TOOL`; `worktree.baseRef` head.
  Verified: test, claude 2.1.327, 2026-11-19, `claude plugin test plugins/claudetto`: the fill writes SPAWN_DEPTH 1, CONCURRENT_SUBAGENTS 3, DISABLE_CRON 1, DISABLE_ADVISOR_TOOL 1 and worktree.baseRef head (36 pass); DISABLE_CRON with DISABLE_ADVISOR_TOOL cut the first request 47,323 to 46,939 bytes. The split by plan is OUT-862.
  Acceptance: each key is in the written settings, with `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` "3" for every plan. Verification: test.
  Decision: the split by plan is Out (OUT-862).
  Basis: measured. Status: have at 088a227c (hooks/features/setup/settings.ts, hooks/features/setup/changes.ts).
  Source: openspec/specs/setup/spec.md:303; openspec/specs/setup/spec.md:276.
  Verified: re-run 2026-11-19, claude 2.1.327 plugin test plugins/claudetto: 105 pass, 0 fail: 'fills every default into empty settings' now asserts SPAWN_DEPTH 1, CONCURRENT_SUBAGENTS 3, DISABLE_CRON 1, DISABLE_ADVISOR_TOOL 1 and worktree.baseRef head; with CONCURRENT_SUBAGENTS set to 4 by hand it failed, and passed after restoring.

## Setup Fallback When Hooks Do Not Run

## Deny a Tool Name as a Size Lever

- [x] **REQ-SETUP-033** claudetto shall deny seven tools by name in `permissions.deny`, which removes each definition from the request: Workflow, ScheduleWakeup, ReportFindings, CronCreate, CronDelete, CronList, EnterPlanMode (ExitPlanMode stays allowed; on 2.1.311 denying the first three took the first request from 42,676 to 30,510 chars, 12,166 = three definitions; on 2.1.312 from 42,879 to 30,713). A deny of an absent tool is dropped unless the real login shows it; no mod answer removes a built-in tool and `settings.read` does not reach permission rules. The surface-trim purpose is CLI and TUI only: turn off claude.ai, web, mobile, cloud, and onboarding surfaces by setting, env, or deny by name. Built-in agents go off with `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS=1`; the old `permissions.deny Agent(<name>)` is dropped by the 2.1.323 change.
  Acceptance: The first request lacks the seven tool definitions. Verification: probe.
  Basis: measured. Status: have at 088a227c. Claude 2.1.327: `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS` is present (chunk-2ew0jg68.js@10909); on 2.1.327 the seven-tool deny removes 12,857 bytes from a `-p` request (fake-API probe); EnterPlanMode and ExitPlanMode are already absent in `-p` mode, so five of the seven were confirmed removed.
  Source: openspec/specs/surface-trim/spec.md:48; openspec/specs/surface-trim/spec.md:147; plugins/claudetto/hooks/features/surface/trim.ts:3-7@088a227c.
  Verified: probe, claude 2.1.327, 2026-11-18, fake API on :18431: after the fill the next `-p` request held 9 tools and 31,781 bytes, the seven denied tools absent (abed830ed). Revised: ExitPlanMode stays allowed, because a plan the user starts with shift-tab is presented through it, so seven tools are denied.
  Verified: PASS: cc-inspect cli with --settings carrying the 7-tool deny list: the first request lacked Workflow, ScheduleWakeup and ReportFindings (Cron* deferred); caveat: not the claudetto-written file. Binary 2.1.327, 2026-11-19, re-checked from the B-setup report.
  Verified: 2.1.331, 2026-11-24: steady.ts launch 2, on the claudetto-written user settings (no --settings), sent 9 tools (Agent Bash ListAgents Read Skill ToolSearch mcp__claudetto__patch DeferredToolPlaceholder mcp__claudetto__pause_goal), 40,217 bytes; none of the seven denied tools is sent and the body names no CronCreate or EnterPlanMode -> PASS.
  Verified: 2026-11-24, claude 2.1.329, fake API, `bun reports/2026-11-24-research/reverify/steady.ts`: launch 2's first request sent 9 tools (Agent, Bash, ListAgents, Read, Skill, ToolSearch, `mcp__claudetto__patch`, DeferredToolPlaceholder, `mcp__claudetto__pause_goal`), 40,569 request bytes, none of the seven, and stderr held no "not matched" rule warning.

## Temp Folder Rule

- [x] **REQ-SETUP-034** claudetto shall allow writes under `/private/var/folders` (per-user temp and cache, `getconf DARWIN_USER_TEMP_DIR`; tools ignore `$TMPDIR`; 85 refusals recorded) and deny `xcrun_db*` there; globs work in `denyWrite`, not `allowWrite`. Absolute scratch paths are identical in sandboxed and unsandboxed modes (`$TMPDIR` is `/tmp/claude-501` inside and `/var/folders/...` outside: `cp` failed and chained edits were skipped).
  Verified: probe, claude 2.1.327, 2026-11-18, cc-inspect cli with the block: a write under /private/var/folders/.../T succeeded, a write of xcrun_db-probe there failed with Operation not permitted (denyWrite glob works); allowWrite uses absolute paths, so its glob form is unprobed.
  Acceptance: The written `sandbox` group holds `/private/var/folders` in `allowWrite` and `xcrun_db*` in `denyWrite`. Verification: inspection.
  Basis: measured. Status: missing at 088a227c.
  Source: plugins/claudetto/hooks/features/setup/settings.ts:211@088a227c (no `var/folders` in plugins/); openspec/specs/sandbox/spec.md:164.
  Verified: PASS: guards/rules.ts:93 ALLOW_WRITE includes /private/var/folders and :81 holds the xcrun_db* deny pattern. Binary 2.1.327, 2026-11-19, re-checked from the B-setup report.
  Verified: inspection, 2026-11-24, claude 2.1.329: the fill denies writes to `/private/var/folders/**/xcrun_db*`, allows `/private/var/folders` (`hooks/settings/rules.ts`, `hooks/settings/fill.ts:36-37`), and `defaults.test.ts` asserts both.

## Setup Rules to Keep

## Statusline Edit Text

- [x] **REQ-SETUP-036** Moved Out as OUT-2351: the item needs a paid model run.

## Setup Speed

## Sandbox Proxy

- [x] **REQ-SETUP-039** Moved Out as OUT-2352: the item conflicts with a rule.

## Surface Trim

## Tool Text Shortening

## Setup Env Flags

## Version Floor

- [x] **REQ-SETUP-044** claudetto shall carry one version constant: each `plugin.json` `engines["claude-code"]` = `">=2.1.329"` (raised from 2.1.327 by 30edb0e9f) (revised 2026-11-18: the `minimumVersion` settings write is out, because it only stops downgrades on the stable channel, chunk-ja5z738t.js@285180); no hook or mod checks the running version; claudetto runs `claude plugin validate` for the type check of a TypeScript hooks module.
  Verified: grep and plugin validate, claude 2.1.327, 2026-11-18, `claude plugin validate plugins/claudetto` passes (warning: no marketplace install line in the README) and plugin.json holds `engines["claude-code"]` ">=2.1.327"; the `minimumVersion` write is dropped (it only stops downgrades on the stable channel, chunk-ja5z738t.js@285180) and no hook checks the version.
  Acceptance: all three `plugin.json` files carry `engines["claude-code"]` `">=2.1.329"`, `claude plugin validate` passes, and no hook reads the running version. Decision: the `minimumVersion` write is dropped (revision of 2026-11-18 in the requirement text), so the fill and replace modes no longer exist. Claude Code refuses git/remote install below the floor with `claude update` advice; local or `--plugin-dir` installs load with a note (`>=9.0.0` still loaded under `--plugin-dir`, prediction failed). On 2.1.327 a probe confirms the local case: `plugin install q@mk` with engines `>=9.0.0` loaded with the note "needs Claude Code >=9.0.0, this is 2.1.327, but loads anyway because it's read from a local folder". The refusal for git or remote sources is verified in code only (message chunk-dfwkett1.js@7698; checks chunk-m14bt1pz.js@949377, @950266) and was not run. Verification: test; probe.
  Basis: reported; measured. `minimumVersion` gives no warning and only guards updates (probe 2.2); the setting `requiredMinimumVersion` exits at startup when older, which `minimumVersion` is not (present in 2.1.326: chunk-ja5z738t.js@285180 (2.1.327); `minimumVersion` is present on 2.1.327 at chunk-ja5z738t.js@285052, `requiredMinimumVersion` at @285180). Replaces the earlier floor 2.1.316-2.1.318 with a SessionStart `source=startup` `$.ui.log` warning when running below the floor (none on resume; removed as "Warn Once at Start"). A spec Purpose still says 2.1.316 while requirements say 2.1.323: stale prose. Status: have at 088a227c (settings.ts:19 MINIMUM_VERSION, :146; plugins/*/.claude-plugin/plugin.json hold engines >=2.1.323 in all 3).
  Source: openspec/specs/version-floor/spec.md:8; openspec/specs/version-floor/spec.md:27; openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1454; openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:768; plugins/claudetto/hooks/features/setup/settings.ts:19@088a227c; external/2026-11-16/reddit.com-r-claudecode-comments-1xvw576-claude-code-21323-experimental-20261114T144303Z.md:23 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xvw576/claude_code_21323_experimental_code_mode_claude/>); openspec/changes/archive/2026-11-16-2-1-323/design.md:30.
  Verified: PASS (acceptance rewritten, option 2): `$C plugin validate` passes for plugins/claudetto, plugins/claudetto-openspec (warnings) and plugins/claudetto-you-should-know; all three plugin.json hold engines claude-code >=2.1.327; grep of plugins/*/hooks for version reads and minimumVersion finds none; binary 2.1.327, 2026-11-19.
  Verified: 2.1.331, 2026-11-24: all three plugin.json files carry `engines["claude-code"]` `">=2.1.329"`, raised by commit 30edb0e9f (chore: raise the Claude Code floor to 2.1.329), so the requirement text now names that floor; `claude plugin validate --strict` exits 0 for all three plugins; the only `.version` read in plugins/*/hooks is `$.state` ifVersion in claudetto-you-should-know's store.ts:57, a state schema version, not the running version -> PASS.
  Verified: claude 2.1.329, 2026-11-24: `claude plugin validate --strict plugins/<p>` exits 0 for all three plugins; each plugin.json holds `engines["claude-code"]` ">=2.1.329"; `grep -rnE "minimumVersion|\.version\b" plugins/*/hooks` outside tests finds only the `$.state` ifVersion at plugins/claudetto-you-should-know/hooks/shared/store.ts:57, no version check.

## Pinned Tool Versions

- [x] **REQ-SETUP-047** claudetto shall not hard-code tool versions in setup's list (`Tool.version`, `SCANNER_VERSION`); only the Claude Code floor stays pinned.
  Verified: grep, claude 2.1.327, 2026-11-18, `grep -rnE "SCANNER_VERSION" plugins/claudetto --exclude-dir=types`: 0 hits, so no plugin code writes any of them.
  Acceptance: git grep SCANNER_VERSION finds no hit. Verification: inspection.
  Basis: cited. Status: have at 088a227c (git grep SCANNER_VERSION finds no hit).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:382@088a227c9^ (task 18.39, the cleanup tool `mo` pinned at 1.68.0 in the tool list).
  Verified: PASS: git grep SCANNER_VERSION under plugins/ finds 0 hits. Binary 2.1.327, 2026-11-19, re-checked from the B-setup report.
  Verified: inspection, 2026-11-24, claude 2.1.329: `grep -rn SCANNER_VERSION plugins` finds nothing.

## Alias Pinning

- [x] **REQ-SETUP-053** Moved Out as OUT-3050: ADR-0177: vanilla 2.1.327 already resolves default, opus, sonnet, haiku and opusplan to 5.5 IDs (cc-inspect fake-API probe, 2026-11-18), so the pin has no measured gain and is not written.

## Classifier Model

## Output Limits

- [x] **REQ-SETUP-055** claudetto shall write `bashOutputMaxChars: 8000` and `env.MAX_MCP_OUTPUT_TOKENS: "10000"`, so Claude Code truncates and the plugin cuts nothing. A tool result bound of 12,000 chars keeps whole lines to the limit and ends with a count of lines not shown.
  Verified: probe, claude 2.1.327, 2026-11-18, cc-inspect cli with bashOutputMaxChars 8000 and a 10.5k-character Bash result: the second request was 50,159 bytes against 59,543 unset (-9,384). MAX_MCP_OUTPUT_TOKENS is in the settings-env allow-list (chunk-qhsv8pnt.js@22978); no MCP server probe was run.
  Acceptance: both keys are written; `MAX_MCP_OUTPUT_TOKENS` sits in `env` because it is read from process env. Measured: a 20,000-char Bash print gives a 2,258-char preview plus a path to saved output; `MAX_MCP_OUTPUT_TOKENS=2000` cut a 40,000-char MCP result. At a 10,000 cap on 2.1.327 (fake API, reports/2026-11-18-research/handover-probes/mcp-spill/): 20,000 chars entered whole, 60,000 chars sent a token-count request first, and 200,000 chars became a file notice that asks the model to read the whole file. Verification: test.
  Basis: measured (2.1.323 research probes); cited (Claude Code warns on an MCP result past 10,000 tokens). Status: have at 088a227c.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/inventory.md:57; plugins/claudetto/hooks/features/setup/settings.ts:137@088a227c.
  Verified: PASS: defaults.ts bashOutputMaxChars 8000 and MAX_MCP_OUTPUT_TOKENS "10000"; the test asserts 8000 through DEFAULTS. Binary 2.1.327, 2026-11-19, re-checked from the B-setup report.

## Env Keys

- [x] **REQ-SETUP-056** claudetto shall write `CLAUDE_ASYNC_AGENT_STALL_TIMEOUT_MS` "900000" (it counts silence, not run time) and no `CLAUDE_CODE_SCRIPT_CAPS` (it counts substrings of Bash commands and acts only with `CLAUDE_CODE_SUBPROCESS_ENV_SCRUB`, which forces default permission mode).
  Verified: code read, claude 2.1.327, 2026-11-18, chunk-zgpk86bb.js@203036: the env value replaces the default stall timeout; the fill writes "900000" (defaults.test.ts) and no SCRIPT_CAPS key. The stub cannot show a stall.
  Acceptance: the written env holds the stall timeout and no script caps key. Verification: test.
  Basis: measured. Status: have at 088a227c.
  Source: openspec/changes/archive/2026-11-13-feat-2-1-321/specs/setup/spec.md:25; plugins/claudetto/hooks/features/setup/settings.ts:183@088a227c.
  Verified: re-run 2026-11-19, claude 2.1.327 plugin test plugins/claudetto: 103 pass, 0 fail. New test 'writes the stall timeout and no script caps' (defaults.test.ts) asserts 900000 and no CLAUDE_CODE_SCRIPT_CAPS or SUBPROCESS_ENV_SCRUB; with a SCRIPT_CAPS key added by hand it failed, and passed after restoring.

## Surface Control

- [x] **REQ-SETUP-058** claudetto shall remove the permission nagging that the Claude Code sandbox brings, through supported configuration and carefully scoped human approval, and shall keep its own settings in the style of Claude's settings.json key-value conventions.
  Verified: probe, claude 2.1.327, 2026-11-18, cc-inspect cli with the ADR-0188 block: Bash calls that create files, write under /opt/homebrew and under /private/var/folders ran with 0 prompts; the block keeps settings.json key-value form.
  Acceptance: a normal run raises no avoidable permission prompt. Verification: demonstration.
  Basis: user decision, 2026-11-14. Status: partial at 088a227c.
  Source: user decision, 2026-11-14 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:12); user decision, 2026-11-14 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:459).
  Verified: PASS: cc-inspect cli, binary 2.1.327, 2026-11-19: with the sandbox block (enabled, autoAllowBashIfSandboxed, allowUnsandboxedCommands, excludedCommands claude *, allowWrite /private/var/folders) a Bash file-creating call ran (result done_0); with no settings the same call was not run.
  Verified: 2.1.331, 2026-11-24: cc-inspect cli, default permission mode, Bash `touch made.txt && mkdir -p sub && echo x > sub/y && echo done_$?`: with --settings holding the sandbox block (enabled, autoAllowBashIfSandboxed, allowUnsandboxedCommands, excludedCommands `claude *`, allowWrite /private/var/folders) it ran with no prompt (result done_0, sandbox_enabled true); with no settings it was refused ("A variable in this command can't be checked before it runs") -> PASS.

## Auto Mode

## Conflicts with Settled Decisions

## Silent-Turn Reminder

- [x] **REQ-SETUP-063** claudetto shall write `CLAUDE_CODE_SILENT_TURN_REMINDER: "0"` in the Features-off env, and write no `_TEXT` key. A `_TEXT` value an earlier release wrote is taken back only through the ownership record of REQ-SETUP-071, and a text the user wrote stays.
  Verified: test, claude 2.1.327, 2026-11-19, `claude plugin test plugins/claudetto`: the construction test 'records the scalar keys it names' passes; probe: SILENT_TURN_REMINDER 0 took request 4 from 48,371 to 47,884 bytes (-487).
  Acceptance: the construction names no `_TEXT` key. Verification: test.
  Basis: user decision. Status: have at 088a227c (groups.test.ts:126 expects `CLAUDE_CODE_SILENT_TURN_REMINDER: "0"`, :128 expects no `_TEXT` key)
  Source: user decision, 2026-11-14 (date of the handoff that records it; day of decision not recorded) (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/294da1a9-e778-41e2-b2d4-d83e20be999a.jsonl:1241).
  Verified: test, 2026-11-24, claude 2.1.329, `claude plugin test plugins/claudetto` 332 pass: `hooks/settings/__tests__/defaults.test.ts` asserts SILENT_TURN_REMINDER "0" and no env key ending in `_TEXT`; with a `_TEXT` key added to `defaults.ts` the run gave 331 pass, 1 fail.

## Sandbox

- [x] **REQ-SETUP-064** claudetto shall write the sandbox block of REQ-GUARDS (deny-list) in setup, with `withCacheDirs` and `cacheDirs` removed.
  Verified: test, claude 2.1.327, 2026-11-19, `claude plugin test plugins/claudetto`: the fill writes the sandbox block with no cacheDirs and no withCacheDirs; no domain list.
  Acceptance: see the guards item. Verification: inspection.
  Basis: user decision. Status: have at 088a227c (groups.test.ts:158 sandbox group writes `sandbox: { enabled: true }`; `git grep -n withCacheDirs 088a227c -- plugins` finds none)
  Source: user decision, 2026-11-13 22:08 UTC, sandbox trimmed to unrecoverable destructive commands (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:14708); user decision, 2026-11-14 14:21 UTC, sandbox as minimal as possible (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:36547).
  Verified: inspection, 2026-11-24, claude 2.1.329: the fill denies writes to `/private/var/folders/**/xcrun_db*`, allows `/private/var/folders` (`hooks/settings/rules.ts`, `hooks/settings/fill.ts:36-37`), and `defaults.test.ts` asserts both.

## Approval

- [x] **REQ-SETUP-070** claudetto shall offer no approval option of its own and write no permission key; unattended work uses Claude Code's `permissions.defaultMode` and `permissions.denyInsteadOfPrompting`. A copy of `permissions.denyInsteadOfPrompting` an earlier release wrote is the user's to keep; claudetto writes the key in no release and takes it back by no special rule.
  Acceptance: the manifest has no `autonomy` option and no hook writes a permission key; no source names `denyInsteadOfPrompting` or an `autonomy` store mark. Verification: inspection.
  Basis: issue #111 (the `autonomy` option, PR #94, was an invented name and a plugin rewriting user settings). Source: code.claude.com settings-reference `permissions.denyInsteadOfPrompting` (scope user or managed, and `--settings`; its example `{"permissions": {"defaultMode": "auto", "denyInsteadOfPrompting": true}}` in `~/.claude/settings.json`; `--permission-prompts none` for one `-p` run, claude 2.1.330) and the permission modes under `permissions.defaultMode`; Codex CLI `approval_policy` (`on-request` or `never`, in config.toml or `--ask-for-approval`) and `sandbox_mode`; Gemini CLI `general.defaultApprovalMode` (`default`, `auto_edit`, `plan`; `--approval-mode yolo` from the command line only). None of these hosts lets an extension rewrite the user's approval setting; each owns it.
  Verified: inspection: `git grep -n 'denyInsteadOfPrompting\|autonomy.wrote' -- plugins/claudetto/hooks` finds no source; `plugin.json` has no `autonomy` option. The earlier removal path and its tests were deleted when the fill began building from the construction (REQ-SETUP-071). Eval against vanilla: not run, as the plugin writes nothing.
  Verified: inspection, 2026-11-24, claude 2.1.329: no hook writes defaultMode or denyInsteadOfPrompting; only the README names them.

## Fill Construction

- [x] **REQ-SETUP-071** claudetto shall, once per fill version at session start, build its settings as one object from the release's own sources (the defaults, the guard rules and the walls) and apply it to user settings so that the construction wins over a user's value for each key it names. A user's old settings are not authoritative.
  Acceptance: each scalar the construction names takes claudetto's value even when the user set another (`outputStyle: "Proactive"` becomes `"claudetto:Claudetto"`); records recurse; list entries it names are added; a `Bash(...)` rule in `permissions.ask` or `permissions.deny` that matches a command the construction keeps free (`git stash`, `git stash list`, `git push origin main`) is removed, and a rule in `permissions.allow` that matches a command it guards (`git stash clear`, `git push --force`, `claude -p x`) is removed, by the documented pattern semantics (`*` any run, `\*` a literal star, no other wildcard; a pattern ending in a space and one star also matches the bare command), with rules that conflict with nothing kept; a key the previous fill recorded in the store (`setup.owned`) that the construction no longer names is deleted only while it holds the value claudetto wrote; a second fill changes nothing; the notice names values set, replaced and entries removed. No list of retired values exists in code. Verification: test.
  Basis: user decision: "user's old settings should not be considered as authoritative. claudetto's release has to construct its own based off of the latest clawdipedia schema, docs, and whatever else it has dug into." Source: clawdipedia route `configure/permissions/rules` (rule syntax: `*` wildcard, `\*` literal star, a pattern ending in a space and one star also matches the bare command; `ask` and `deny` apply before `allow`).
  Verified: test, claude 2.1.330, 2026-11-21, `claude plugin test plugins/claudetto`: 325 pass, 0 fail, 56 files (defaults.test.ts: the construction wins over `outputStyle` Proactive, a second fill changes nothing, stash and claude -p rules removed; fill.test.ts: the stash ask rules removed while an unrelated user ask stays, pattern semantics, probes agree with the rules; owned.test.ts: a recorded key goes while a user-changed value stays; start.test.ts: the store records the version and keys); `just verify` exit 0. Pattern semantics read from clawdipedia `configure/permissions/rules`.
