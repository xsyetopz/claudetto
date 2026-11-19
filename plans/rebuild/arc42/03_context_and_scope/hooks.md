# Hooks

## Hooks and Events

- [x] **CTX-840** The task-boundary payloads on claude 2.1.327 are these. Every payload holds session_id, transcript_path, cwd, prompt_id and hook_event_name. TaskCreated and TaskCompleted add task_id, task_subject and task_description, with no status and no list of the other tasks, so a renewal check calls TaskList to learn whether work remains. PostToolUse on Bash adds permission_mode, effort.level, tool_name, tool_input.command, tool_response {stdout, stderr, interrupted, isImage, noOutputExpected}, tool_use_id and duration_ms, with no exit code, so a commit match reads tool_input.command plus a non-interrupted response with stdout. Stop adds permission_mode, effort.level, stop_hook_active, last_assistant_message, background_tasks and session_crons. The task tools are deferred under `-p` and need a ToolSearch `select:` call first.
  Basis: measured. Status: closes the open probe in ADR-0178 and RT-027.
  Source: probe G, claude 2.1.327, 2026-11-18, cc-inspect `code cli` with TaskCreated, TaskCompleted, PostToolUse and Stop command hooks writing stdin to an absolute log (reports/2026-11-18-research/handover-probes/probe-g/probe.log and hooks.log).
  Verified: source already on 2.1.327.
  Verified: re-run on claude 2.1.327, 2026-11-19: partial: 2.1.327 binary string counts >0 for task_subject, task_description, background_tasks, session_crons, noOutputExpected, last_assistant_message, stop_hook_active, TaskCreated, TaskCompleted; payload key-by-key and "no exit code" not re-run (hook-stdin capture via cc-inspect cli could not show the hook output file)

- [x] **CTX-841** SessionStart reports `source` "startup" at launch, "compact" after `/compact` (with `model` set), and "clear" after `/clear` (with `model` null). PreCompact before a `/compact` carries `trigger` "manual" and `custom_instructions` null. A handover injector therefore keys on SessionStart `source` "clear" or "compact" to put the pending handover into the first turn.
  Basis: measured.
  Source: probe I, claude 2.1.327, 2026-11-18, cc-inspect `code cli` with `--settings` holding SessionStart and PreCompact command hooks, prompts one, /compact, two, /clear, three (reports/2026-11-18-research/handover-probes/probe-i/probe.log and hooks.log).
  Verified: source already on 2.1.327.
  Verified: not re-run 2026-11-19: runtime SessionStart/PreCompact payload values; cc-inspect cli cannot display a hook-written file. Static: custom_instructions literal present in 2.1.327 binary

- [x] **CTX-596** StopFailure runs as a `classic.StopFailure` hook. With `ANTHROPIC_BASE_URL=http://127.0.0.1:9` the run prints "API Error: Connection refused", then `classic.StopFailure`, then `$.ui.notify (claudetto): 40 chars: no-surface`, because `-p` has no surface. The notice fires only on an API-error stop
  Basis: measured.
  Source: openspec/changes/2-1-325-rearchitecture/design.md:150.
  Verified: binary string search, claude 2.1.327, 2026-11-19: StopFailure is in the bundle (17 hits); the behaviour stays as measured on the earlier version named in the fact and was not rerun.
  Verified: not re-run 2026-11-19: needs a plugin run with ANTHROPIC_BASE_URL refusing connections; static: "StopFailure", "Connection refused", "no-surface" literals present in 2.1.327 binary

- [x] **CTX-606** Claude Code 2.1.296 has 33 hook events (PreToolUse to MessageDisplay), unchanged across 2.1.293, 2.1.295, 2.1.296, and all 33 are present on 2.1.326 (cc-inspect `surface` hook-event lists 33 names, 2026-11-17). Permission modes are default/manual, acceptEdits, plan, auto, dontAsk, bypassPermissions; the effort scale is low, medium, high, xhigh, max (chunk-ja5z738t.js@161058, 2.1.327; the persisted `effortLevel` setting accepts low to xhigh only, @278287). claudetto shall rest on these cited Claude Code 2.1.312 facts: 33 hook events; six permission modes (default, acceptEdits, plan, auto, dontAsk, bypassPermissions); deny/ask before allow, a hook's allow cannot override; CLAUDE.md, CLAUDE.local.md, unscoped `.claude/rules/*.md` load at launch inside an "override defaults" reminder; context rebuilt at session start, `/clear`, `/compact`; `paths:` rules load on matching tool touch; Stop-type hooks capped at 8 continuations; <=24 prompt/agent hooks at once; subagents <=20 concurrent, depth 3. 2.1.326: the 33 hook events were checked with cc-inspect `surface`; on 2.1.327 the subagent spawn-depth default is 3 (chunk-ja9j7x1x.js@341); the 8-continuation and 24-hook caps were not located in the program.
  Acceptance: `surface` lists the 33 events on 2.1.326. Verification: probe. Each count is re-queried against 2.1.325 before use. 2.1.326: the 33 hook events were checked with cc-inspect `surface`; on 2.1.327 the 33 events are confirmed again (chunk-ja5z738t.js@5436) and the spawn-depth default is 3 (chunk-ja9j7x1x.js@341); the 8-continuation and 24-hook caps were not located. Verification: probe.
  Basis: cited. Status: have at 088a227c. cited. Status: unchecked: a fact about Claude Code, not code at 088a227c.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/cc-2-1-323.md:91; openspec/changes/archive/2026-11-16-2-1-323/research/user-dossier.md:69; Clawdipedia capture 541cf9e, Claude Code 2.1.312 (27 Oct 2026), read through clawdipedia-docs.
  Verified: re-run on claude 2.1.327, 2026-11-19: partial: 2.1.327 binary has all of MessageDisplay, PostModelSwitch, UserPromptExpansion, StopFailure, PermissionDenied; subagent spawn depth default n=3 (cc-inspect read chunk-ja9j7x1x.js@150, CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH); concurrent subagents ECt=20; 33-event count and effort scale offsets not re-counted

## Hooks and Events
  Verified: cc-inspect surface, claude 2.1.327, 2026-11-19: hook-event lists 33 names; the permission-mode part was not rechecked.

- [x] **CTX-625** Mod API limits measured on 2.1.325; re-measured on 2.1.327 for one: from `turn.complete` under `-p`, `$.session.compact()` throws "not available in a headless (-p / SDK) session yet: compaction here runs inside a turn (a /compact prompt)" (cc-inspect cli with a plugin under `--plugin-dir`, fake API, 2026-11-18). The mid-turn throw, the interactive PTY compaction and the 13-29 s fork time are kept as measured on 2.1.325; the interactive ones need a PTY session, and `session.compact` and `model.fork` are present in the 2.1.327 surface: `$.session.compact()` mid-turn throws "a turn is running"; from `turn.complete` under `-p` it throws "not available in a headless (-p / SDK) session yet"; interactive works and the module's `session.compact` hears it; the test kit gives a plugin's own call neither trigger nor messages; `$.model.fork` takes effort only, no model; fork handoffs take 13-29 s each. A plugin-started compaction is rejected headless (reported). Hook modules have no `process`; a throwing hook logs `session.compact hook skipped`. Also: from a `turn.step` hook the call throws "a turn is running"; from `turn.complete` in an interactive PTY session it compacts and runs the `$.model.fork` handoff. In the test kit a `turn.complete` stub must answer with the plain result `{ text: "done" }` (the `{ value }` form gives "no implementation") and a compaction stub must leave at least one message.
  Acceptance: three fake-API probes reproduce the three results. Verification: probe. Each of the three stub forms behaves as stated under `claude plugin test`. Verification: probe.
  Basis: measured.
  Source: openspec/changes/2-1-325-rearchitecture/design.md:64; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:2677 (handoff, Age handoff probes 1-3; scripts in `/private/tmp/claude-501/probe-age/`, types at `.claude-plugin/types/claude-code/index.d.ts:3064-3069`).
  Verified: re-run on claude 2.1.327, 2026-11-19: binary 2.1.327 contains "not available in a headless (-p / SDK) session yet: compaction here runs inside a turn (a /compact prompt); catch it and carry on" and "a turn is running"; 13-29 s fork time and PTY behaviour NOT RE-RUN (interactive); "session.compact hook skipped" literal not found (only "hook skipped" 5 hits), so that sub-claim is unconfirmed

## Hooks and Events
  Verified: binary string search, claude 2.1.327, 2026-11-19: "not available in a headless" is in the bundle (2 hits); the behaviour stays as measured on the earlier version named in the fact and was not rerun.

- [x] **CTX-627** Hook data (2.1.326 events present, binary string search: PermissionDenied, SubagentStop, Stop): Stop rows hold this turn's tool results with `isError`, no denial field; a permission-rule denial has fixed text, a mod's is its reason in `<tool_use_error>`; `PermissionDenied` supports only `retry`; `SubagentStopHookInput` has `last_assistant_message`, `agent_id`, `stop_hook_active`; `classic.SubagentStop` settles twice per subagent; a rule ending `:*` reads as a legacy prefix, so `Bash(git push * :**)` denies `git push origin :branch`; `deny Agent(Plan)` blocks only the built-in `Plan`; nested Seatbelt `sandbox_apply` fails with exit 71 under any outer deny rule; "No deferred tool marker found in the resumed session" comes from `--resume` with an empty prompt that plugin text taught.
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/design.md:363; openspec/changes/archive/2026-11-09-release-2-1-319/design.md:248; openspec/changes/archive/2026-11-16-2-1-323/research/probes.md:186; openspec/specs/claim-check/spec.md:10; openspec/changes/archive/2026-11-13-feat-2-1-321/tasks.md:91; the `deny Agent(Plan)` fact: unresolved, not found by grep.
  Verified: re-run on claude 2.1.327, 2026-11-19: partial: 2.1.327 binary has PermissionDenied, SubagentStop, last_assistant_message, stop_hook_active; "No deferred tool marker found" x2; the type name SubagentStopHookInput is 0 hits (minified), and the :* prefix, Agent(Plan) and exit-71 claims not re-run

## Hooks and Events
  Verified: binary string search, claude 2.1.327, 2026-11-19: PermissionDenied (43 hits), isReadOnly (108), and agent_type (99) are in the bundle; the behaviour stays as measured on the earlier version named in the fact and was not rerun.

- [x] **CTX-635** A builtin hooks module keeps running after its plugin is disabled in settings: `cc-plugin-agents-md@builtin` still settled `tool.call`, `prompt.submit`, and `turn.*` (lead, headless), because the hooks hot-reload on a `userSettings` change runs only when its tier snapshot changed (`chunk-wqb2b4v0.js@4789330` (claude 2.1.325); verified on 2.1.327 at chunk-m14bt1pz.js@5033944: the settings subscriber reloads only when the source is `policySettings`, or `userSettings` with a changed tier snapshot (`hookHotReloadTierSnapshot`), or admission text is pending, and otherwise logs nothing or "Plugin hooks: skipping reload, plugin-affecting settings unchanged" (@5034449 to @5034703)). After a settings write that disables a builtin, the watcher reads settings 1.2 to 1.5 s later and skills and commands vanish (`yY()` re-reads, `chunk-yjs2ay06.js@72522`, claude 2.1.325; on 2.1.327 the re-read is `xhe`, chunk-dafpvz32.js@80491); the hooks module stays because the hot reload runs only when the tier snapshot changed; the interactive unload, the relaunch, the headless refusal, and the loaded modules are in the neighbouring items.
  Acceptance: the probe shows the hooks still settling after the write. Verification: probe. The debug log shows "hooks modules unloaded: cc-plugin-agents-md@builtin" after the reload. Verification: probe.
  Basis: measured on claude 2.1.325; not rerun on 2.1.326. Status: not found by `code relocate` in 2.1.326, but found on 2.1.327 by literal search ("hookHotReloadTierSnapshot", "Plugin hooks: skipping reload": chunk-m14bt1pz.js@5033944-5034703; the unload path with "hooks modules unloaded" is chunk-m14bt1pz.js@4918690), so the relocate miss was a search miss, not removed code; missing at 088a227c.
  Source: probe: cc-inspect `cli`, claude 2.1.325, 2026-11-16, as the old plan states; chunk-wqb2b4v0.js@4789330 (claude 2.1.325 binary; 2.1.327: chunk-m14bt1pz.js@5033944); probe, `claude` 2.1.325, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:6352); probe 3 raw logs were later deleted, so its facts rest on quoted lines (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:6738); probes 1 and 2 are worker-only.
  Verified: binary string search, claude 2.1.327, 2026-11-19: cc-plugin-agents-md (4 hits) and "hooks modules unloaded" (2) are in the bundle; the behaviour stays as measured on the earlier version named in the fact and was not rerun.
  Verified: re-run on claude 2.1.327, 2026-11-19: partial: 2.1.327 binary has hookHotReloadTierSnapshot (3) and "skipping reload, plugin-affecting settings unchanged"; the runtime survival of the builtin after disable not re-run

- [x] **CTX-636** An interactive `/reload-plugins` unloads a disabled builtin hooks module ("hooks modules unloaded: cc-plugin-agents-md@builtin (plugin disabled or uninstalled)"), and a relaunch never loads it (worker, interactive, raw logs checked by lead). Headless `/reload-plugins` refuses ("isn't available over a remote connection in this session").
  Acceptance: the logs show the unload text (2.1.327: built at `chunk-m14bt1pz.js@4918690`); headless prints the refusal. Verification: probe.
  Basis: measured on claude 2.1.325; not rerun on 2.1.326. Status: missing at 088a227c.
  Source: probe: cc-inspect `cli`, claude 2.1.325, 2026-11-16, as the old plan states, claude 2.1.325 (interactive and headless runs).
  Verified: binary string search, claude 2.1.327, 2026-11-19: cc-plugin-agents-md (4 hits) and "hooks modules unloaded" (2) are in the bundle; the behaviour stays as measured on the earlier version named in the fact and was not rerun.
  Verified: re-run on claude 2.1.327, 2026-11-19: partial: 2.1.327 binary has "hooks modules unloaded" (2) and "isn't available over a remote connection" (2); interactive reload NOT RE-RUN

- [x] **CTX-638** PreToolUse exit 2 blocks and sends stderr to the model; exit 1 is non-blocking; PostToolUse cannot prevent the action. 2.1.326: present (PreToolUse, PostToolUse; binary string search).
  Basis: cited docs.
  Source: external/please-use-me-often/agent-failure-dossier/judged/hook.jsonl:19; openspec/changes/archive/2026-11-16-2-1-323/research/user-dossier.md:170.
  Verified: binary string search, claude 2.1.327, 2026-11-19: PreToolUse and PostToolUse are in the bundle (hook-event list 33 names, cc-inspect surface); the behaviour stays as measured on the earlier version named in the fact and was not rerun.
  Verified: not re-run 2026-11-19: exit-code semantics not probed; static: PreToolUse/PostToolUse present, and the binary text "PreToolUse hook failed with an unexpected error. The tool call was not executed" exists

- [x] **CTX-639** `$.http.fetch` wait stops the hook clock even with `$.clock.sleep` raced beside it; it has its own 30 s cap, is not cancellable and takes no `signal`. 2.1.326: present (`$.http.fetch`; binary string search).
  Basis: measured 2.1.318.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/design.md:156; openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:68.
  Verified: binary string search, claude 2.1.327, 2026-11-19: http.fetch is in the bundle (21 hits); the behaviour stays as measured on the earlier version named in the fact and was not rerun.
  Verified: re-run on claude 2.1.327, 2026-11-19: partial: $.http.fetch and $.clock.sleep present in 2.1.327 (clawdipedia page lists them; sleep doc says "the hook's budget continues during the wait"); the 30 s fetch cap and stopped-clock claim not re-measured

- [x] **CTX-640** A plugin `settings.read` hook changes 1 of 7 measured keys in `-p`; plugin root `settings` reaches only `agent` and `subagentStatusLine`; `minimumVersion` gives no warning and guards updates only. 2.1.326: present (settings.read, minimumVersion; binary string search).
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:23; openspec/specs/version-floor/spec.md:10.
  Verified: binary string search, claude 2.1.327, 2026-11-19: settings.read (31 hits), subagentStatusLine (21), and minimumVersion (9) are in the bundle; the behaviour stays as measured on the earlier version named in the fact and was not rerun.
  Verified: re-run on claude 2.1.327, 2026-11-19: partial: settings.read and minimumVersion literals present in 2.1.327 binary; the 1-of-7 keys measurement NOT RE-RUN

- [x] **CTX-641** In CC 2.1.319 a changed tool input voids auto mode's review (`serverClassifierInputRewritten`); such calls return "gave no verdict". 2.1.326: present (`serverClassifierInputRewritten`, chunk-270tbjq0.js:41884 (2.1.327)). The 2.1.326 release notes say a PreToolUse hook's `updatedInput` is now kept when more than one hook answers a tool call, so the rewrite runs in more cases.
  Basis: measured.
  Source: openspec/specs/low-hitl/spec.md:249; <https://github.com/anthropics/claude-code/releases/tag/v2.1.326> (release notes).
  Verified: binary string search, claude 2.1.327, 2026-11-19: serverClassifierInputRewritten is in the bundle (4 hits); the behaviour stays as measured on the earlier version named in the fact and was not rerun.
  Verified: re-run on claude 2.1.327, 2026-11-19: 2.1.327 binary: serverClassifierInputRewritten x4, "gave no verdict" x20

- [x] **CTX-643** `claude plugin validate --strict --json` lists gating hooks with `hasCatch`. 2.1.327: present (`hasCatch` in a hook registration at chunk-m14bt1pz.js@964886; the `claude plugin validate --strict --json` output is not rerun).
  Basis: cited.
  Source: openspec/specs/mod-architecture/spec.md:133; openspec/changes/archive/2026-11-13-feat-2-1-321/tasks.md:32.
  Verified: binary string search, claude 2.1.327, 2026-11-19: hasCatch is in the bundle (6 hits); the behaviour stays as measured on the earlier version named in the fact and was not rerun.
  Verified: re-run on claude 2.1.327, 2026-11-19: 2.1.327 binary: hasCatch x6; the validate --strict --json output not rerun (as the item says)

- [x] **CTX-649** A call to a tool that `tool.list` removed returns "No such tool available. A plugin removed this tool from the session; do not call it again." The classic PreToolUse hook fires first and no `tool.check` event follows.
  Basis: measured (probe 11).
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/probes.md:58; openspec/changes/archive/2026-11-16-2-1-323/research/probes.md:133.
  Verified: binary string search, claude 2.1.327, 2026-11-19: "A plugin removed this tool" (2 hits) and "No such tool available" (15) are in the bundle; the behaviour stays as measured on the earlier version named in the fact and was not rerun.
  Verified: re-run on claude 2.1.327, 2026-11-19: partial: 2.1.327 binary holds " A plugin removed this tool from the session; do not call it again." and "No such tool available" (15); that the PreToolUse fires first with no tool.check not re-run

- [x] **CTX-650** In a subagent the classic PreToolUse input carries `agent_id` and `agent_type`; the parent `Agent` call carries neither. `tool.check` carries `agentId` and `isReadOnly`.
  Basis: measured.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/probes.md:131; openspec/changes/archive/2026-11-16-2-1-323/research/probes.md:132.
  Verified: binary string search, claude 2.1.327, 2026-11-19: agent_type (99 hits) and isReadOnly (108) are in the bundle; the behaviour stays as measured on the earlier version named in the fact and was not rerun.
  Verified: not re-run 2026-11-19: needs a subagent run with a plugin; no literal check made

- [x] **CTX-652** A git-source plugin whose cached `plugin.json` range stops fitting: `claude -p` still exits 0, the plugin's hooks do not fire, and stderr prints "not loaded: needs Claude Code >=9.0.0" (error type `engine-range-unsatisfied`). A plugin update to a version outside the range is skipped and the old copy stays.
  Basis: measured.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/probes.md:155; openspec/changes/archive/2026-11-16-2-1-323/research/probes.md:156; openspec/changes/archive/2026-11-16-2-1-323/research/probes.md:157.
  Verified: binary string search, claude 2.1.327, 2026-11-19: "needs Claude Code" (7 hits) and engine-range-unsatisfied (9) are in the bundle; the behaviour stays as measured on the earlier version named in the fact and was not rerun.
  Verified: re-run on claude 2.1.327, 2026-11-19: partial: 2.1.327 binary has engine-range-unsatisfied x9, "not loaded:" x49 and "needs Claude Code" x7 (message composed from parts); exit 0 and skipped-update behaviour NOT RE-RUN

- [x] **CTX-654** Advisor gate: `trn()` returns false when `CLAUDE_CODE_DISABLE_ADVISOR_TOOL` is set. `ux()` is true when `CLAUDE_CODE_ENABLE_EXPERIMENTAL_ADVISOR_TOOL` is set or flag `tengu_sage_compass2` is on. This account has the flag on and the disable env set by the user.
  Basis: measured (read from binary strings).
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/probes.md:124.
  Verified: binary string search, claude 2.1.327, 2026-11-19: CLAUDE_CODE_DISABLE_ADVISOR_TOOL (4 hits), CLAUDE_CODE_ENABLE_EXPERIMENTAL_ADVISOR_TOOL (4), and tengu_sage_compass2 (2) are in the bundle; the behaviour stays as measured on the earlier version named in the fact and was not rerun.
  Verified: re-run on claude 2.1.327, 2026-11-19: 2.1.327 binary: CLAUDE_CODE_DISABLE_ADVISOR_TOOL x4, CLAUDE_CODE_ENABLE_EXPERIMENTAL_ADVISOR_TOOL x4, tengu_sage_compass2 x2; minified names trn()/ux() and account flag state not re-checked

- [x] **CTX-853** On claude 2.1.327 `--safe-mode` drops hooks passed with `--settings`: a PreToolUse hook that appends to a file did not run under `--safe-mode --settings s.json`, and ran under `--setting-sources project --settings s.json`. A lab arm that adds a hook therefore uses `--setting-sources project --strict-mcp-config` as its base, and so does the vanilla arm it is compared with.
  Acceptance: both lab arms start from the same base and differ only in `--settings`. Verification: probe.
  Basis: measured (two cc-inspect cli runs on a fake API, 2026-11-18). Status: done in reports/2026-11-18-research/incident-lab/run.py.
  Source: reports/2026-11-18-research/incident-lab/run.py; ADR-0187.
  Verified: not re-run 2026-11-19: safe-mode vs --settings hook run needs a hook-written file that cc-inspect cli cannot show; static: "safe-mode" literals present (19 lines) in 2.1.327 binary

## External Sweep, 2026-11-18
  Verified: source already on 2.1.327.

- [x] **CTX-880** Plain stdout of an exit-0 hook becomes context only on `UserPromptSubmit`, `UserPromptExpansion`, `SessionStart` and `PostModelSwitch` (documented, Claude Code 2.1.327). A `UserPromptSubmit` hook that prints a short requirements file puts the original ask and constraints in front of the model every turn; each print adds tokens to every turn and sits after the cached prefix.
  Basis: cited (https://clawdipedia.cc/extend/hooks/input-and-output, Documented badge, 2.1.327); the per-turn requirements use is reported (third-party).
  Source: external/2026-11-03/reddit.com-r-claudeai-comments-1xmpmg8-starting-today-my-hook-forcing-c-20261103T145340Z.md:114; https://clawdipedia.cc/extend/hooks/input-and-output.
  Verified: source already on 2.1.327.
  Verified: not re-run 2026-11-19: docs lookup of the stdout-as-context event list not completed (read_page section fetch failed); static only: UserPromptExpansion, PostModelSwitch present in 2.1.327 binary

