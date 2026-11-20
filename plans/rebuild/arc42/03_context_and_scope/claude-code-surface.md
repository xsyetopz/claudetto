# Claude-Code-Surface

## Claude Code Surface and Version Notes

- [x] **CTX-315** Hook log fields: `tool_use_id` is on the PreToolUse input and on both post-tool inputs (a retry is a new id; the permission-request input has no tool_use_id); `is_interrupt` on PostToolUseFailure tells a stopped call from an errored one; Stop does not fire on interrupt, and API errors fire StopFailure, so also log StopFailure and SessionEnd; a PreToolUse id still open at Stop goes in a "never resolved" bucket, not counted as failure or denial; a failure does not prove nothing happened; async is for record-only hooks since PreToolUse must stay synchronous to block.
  Acceptance: Each field is checked against claude 2.1.327 before use; `tool_use_id`, `is_interrupt`, `PostToolUseFailure`, and `StopFailure` are present in the 2.1.327 hook input and event list (code search `is_interrupt` at chunk-rj3e7agr.js@271977, `StopFailure` at chunk-rj3e7agr.js@268292), on 2.1.327 `PostToolUse` and `PostToolUseFailure` inputs carry `tool_use_id`, and `PostToolUseFailure` carries `error` and optional `is_interrupt` (chunk-rj3e7agr.js@271977); the PreToolUse and permission-request fields were not re-read. Verification: probe.
  Basis: reported by the author of a recorder tool and commenters; the fields not named in the Acceptance line were not re-read on 2.1.327. The plan holds only "log PostToolUseFailure besides PostToolUse".
  Status: n/a (fact); PostToolUseFailure and is_interrupt appear nowhere in plugins at 088a227c; StopFailure appears in `features/stop-notice`.
  Source: external/2026-11-16/reddit.com-r-claudecode-comments-1xuk52d-if-you-log-claude-codes-hooks-20261116T052718Z.md:37,39,41,67,75,79 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xuk52d/if_you_log_claude_codes_hooks_add/>)
  Verified: binary string search, claude 2.1.327, 2026-11-19: is_interrupt (5 hits) and StopFailure (17) are in the bundle; the other fields stay as noted in the fact.
  Verified: re-run on claude 2.1.327, 2026-11-19: partial: is_interrupt present x5 in 2.1.327 binary; tool_use_id/StopFailure field list not re-run

- [x] **CTX-321** CLAUDE_CODE_HOOK_HEARTBEAT_INTERVAL_MS takes 100 to 30000 ms. A hook heartbeat (note 6) means the status-line heartbeat file needs review.
  Basis: cited.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/cc-2-1-323.md:38.
  Verified: binary string search, claude 2.1.327, 2026-11-19: CLAUDE_CODE_HOOK_HEARTBEAT_INTERVAL_MS is in the bundle (4 hits); the 100 to 30000 range was not reread.
  Verified: re-run on claude 2.1.327, 2026-11-19: partial: CLAUDE_CODE_HOOK_HEARTBEAT_INTERVAL_MS present in 2.1.327 binary; the 100-30000 range not located in context

- [x] **CTX-322** CLAUDE_CODE_OVERLOADED_RETRY_MAX_DELAY_MS (up to 300000) and CLAUDE_CODE_OVERLOADED_RETRY_MAX_WAIT_MS (gated) exist. They bear on the retry and backoff cure for runs lost to an API error.
  Basis: cited.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/cc-2-1-323.md:40.
  Verified: binary string search, claude 2.1.327, 2026-11-19: CLAUDE_CODE_OVERLOADED_RETRY_MAX_DELAY_MS (4 hits) and CLAUDE_CODE_OVERLOADED_RETRY_MAX_WAIT_MS (7) are in the bundle.
  Verified: re-run on claude 2.1.327, 2026-11-19: 2.1.327 binary: CLAUDE_CODE_OVERLOADED_RETRY_MAX_DELAY_MS x4, CLAUDE_CODE_OVERLOADED_RETRY_MAX_WAIT_MS x7; the 300000 cap not checked

- [x] **CTX-323** $.session.model() inside prompt.section is the per-model prompt route. The SessionStart input model was absent in a -p start, so claudetto shall not rely on it.
  Basis: cited, and observed for the absent field.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/cc-2-1-323.md:70-71.
  Verified: binary string search, claude 2.1.327, 2026-11-19: session.model (7 hits) and prompt.section (19) are in the bundle; the absent SessionStart model in a -p start was not rerun.
  Verified: not re-run 2026-11-19: claim about SessionStart model absent in -p start needs a run; not probed

- [x] **CTX-325** In Claude Code 2.1.327 the builtin `cc-plugin-you-should-know` (chunk-nvx1z6pc.js) sets `isAvailable` to `(S3e()||false) && !xo("hipaa") && !xo("zdr") && !xo("ldr") && b(Wo(), Rn)`. `S3e` returns `verdict.complianceTaintsSettled()` or false (chunk-2mhcazb3.js@2480; the verdict is registered at chunk-6z86r3hs.js@37719). `xo(name)` is `taints.includes(name)` (chunk-2mhcazb3.js@1692), so the builtin is off when the taint set holds hipaa, zdr, or ldr. `Wo()` is the gate name `tengu_jolly_dewdrop` (chunk-nvx1z6pc.js@15696) and `Rn` is its default, false (chunk-nvx1z6pc.js@89762). The earlier 2.1.326 search missed the call because it looked in chunk-na8s6d5h.js, a module name that changed; the builtin lives in chunk-nvx1z6pc.js in 2.1.327.
  Basis: read from source (2.1.327 binary, cc-inspect code search, 2026-11-18); the run-time outcome of the gate depends on server-side gate state, which the binary does not hold.
  Source: chunk-nvx1z6pc.js@3402, @15696, @89762 (claude 2.1.327 binary); chunk-2mhcazb3.js@1692, @2480 (claude 2.1.327 binary); chunk-6z86r3hs.js@37719 (claude 2.1.327 binary); chunk-2mhcazb3.js@642-2480 (2.1.327; first read in claude 2.1.326 binary); chunk-6z86r3hs.js@37719 (2.1.327) (claude 2.1.326 binary); chunk-jc1ynf6x.js@92000-94036 and @92500 (claude 2.1.325 binary, not located in 2.1.326).
  Verified: source already on 2.1.327.
  Verified: re-run on claude 2.1.327, 2026-11-19: partial: 2.1.327 binary has tengu_jolly_dewdrop x2 and "You should know" x18; the minified isAvailable expression and chunk offsets not re-resolved

- [x] **CTX-326** In 2.1.327 the builtin registers with `rp=()=>NE({...Dn,defaultEnabled:false,hooksModule:Qz(import.meta.dir,Et,()=>gs())})` (chunk-nvx1z6pc.js@90045): `defaultEnabled` is false and the hooks module comes from `Qz`. Hook-argument shapes for the requirements in `prd/you-should-know.md` are read from the mod API declarations: `HooksModule`, `PluginRegisterInput`, `PluginRegisterResult` and `PluginRegisterUses` appear in the types list (clawdipedia get_schema "types", 2026-11-18), and the telemetry plugin registers with `NE({...V,hooksModule:e})` (chunk-g8ypxj28.js@32179). Offsets from 2.1.327: chunk-syz79m2z.js@1000-1700 registers `cc-plugin-you-should-know` and loads chunk-nvx1z6pc.js, and a search for `hooksModule` finds only hook-state keys (chunk-asj6f58y.js@15431).
  Basis: read from source (2.1.327 binary, cc-inspect code search, 2026-11-18) and cited (clawdipedia get_schema "types", 2026-11-18). The bodies of `NE` and `Qz` are host registration plumbing that no claudetto requirement calls.
  Source: chunk-nvx1z6pc.js@90045 (claude 2.1.327 binary); chunk-syz79m2z.js@1000-1700 (2.1.327; first read in claude 2.1.326 binary); chunk-asj6f58y.js@15431 (2.1.327) (claude 2.1.326 binary); chunk-jc1ynf6x.js@92000-94036 (claude 2.1.325 binary, not located in 2.1.326).
  Verified: source already on 2.1.327.
  Verified: re-run on claude 2.1.327, 2026-11-19: partial: 2.1.327 binary has "You should know" strings; defaultEnabled:false and clawdipedia schema types not re-checked

- [x] **CTX-327** The `learn_page` flow is unreachable because no code creates a `making` view. In 2.1.327 the kind `making` appears only in the view validator (chunk-nvx1z6pc.js@34011), the clear-on-session-change test (@34691), and the renderer (@86756); no `kind:"making"` write exists in the module. The `learn_page` telemetry event is at @20047 and @22313, and `pageHtml` is exported at @93521. `Tn` is the export `proposePrompt`, the offer-proposal prompt, not a page-writing prompt.
  Basis: read from source (2.1.327 binary, cc-inspect code search, 2026-11-18). The page-writing text is not transcribed because the flow is unreachable and no claudetto requirement uses it.
  Source: chunk-nvx1z6pc.js@20047 (2.1.327), @22313, @34011, @34691, @86756, @93521 (claude 2.1.327 binary); chunk-nvx1z6pc.js@20047-44593 (claude 2.1.326 binary); chunk-jc1ynf6x.js@37400-73000 (claude 2.1.325 binary).
  Verified: source already on 2.1.327.
  Verified: re-run on claude 2.1.327, 2026-11-19: partial: learn_page x2 and proposePrompt x3 literals present in 2.1.327 binary; the absence of any kind:"making" write not re-verified

- [x] **CTX-328** `closedOfferRows`, the `aboutFit` budgets and the exact desktop hover-card element props are read in 2.1.327. `aboutFit` (`sr`, chunk-nvx1z6pc.js@18025) returns the About note only when the About copy fits the row budget (`scrolls` budgets always fit); `closedOfferRows` is `Mt=(e)=>Pe(tr(e.tag)+e.line,e)`, the row count of the tagged offer line plus its choices (@18025). The desktop hover card `aboutCard` (`At`, @15696) is an absolutely positioned box (bottom 1, left 0, hidden until hover, round dim border, paddingX 1, width 60).
  Basis: read from source (2.1.327 binary, cc-inspect code search, 2026-11-18).
  Source: chunk-nvx1z6pc.js@15696, @18025 (claude 2.1.327 binary); chunk-nvx1z6pc.js@8612-92299 (2.1.327) (claude 2.1.326 binary); chunk-nvx1z6pc.js@81411-90078 (2.1.327; first read in claude 2.1.325 binary).
  Verified: source already on 2.1.327.
  Verified: re-run on claude 2.1.327, 2026-11-19: partial: closedOfferRows x3 and aboutCard x3 literals present in 2.1.327 binary; budgets/props not re-read

- [x] **CTX-329** In 2.1.327 `USER_TYPE==="external"` hides the About copy as well as the Disable button. The module reads env `USER_TYPE` (declared in the env reads list, chunk-nvx1z6pc.js@6537), tests it with `ln=(e)=>e==="external"` (@36997), and stores the result as `M` (@83352). `M` is passed as the third argument of `aboutFrame` (`ir`), which returns `copy:[]` when it is true (@88869 and the `ir` definition at @18025), and it joins the desktop test in `Nn=Ee(a.surface)||M` (@88538). The literal `USER_TYPE==="external"` is absent from the module because of the `ln` helper.
  Basis: read from source (2.1.327 binary, cc-inspect code search, 2026-11-18).
  Source: chunk-nvx1z6pc.js@6537, @18025, @36997, @83352, @88538, @88869 (claude 2.1.327 binary); chunk-nvx1z6pc.js@81411-90078 (2.1.327; first read in claude 2.1.325 binary).
  Verified: source already on 2.1.327.
  Verified: not re-run 2026-11-19: minified-helper reading (ln/ir/Nn at chunk offsets) not re-read; USER_TYPE literal not checked

- [x] **CTX-330** The statements about You should know are read from code. A run of the builtin needs the server-side gate `tengu_jolly_dewdrop` on and a live model fork, so no fake-API run reaches it. A grep of the 2.1.325 binary found the quoted strings (the frame, the length lines, `Press again to disable`, `Chat in main session`, `Not published (blocked by a permission setting)`, `tengu_jolly_dewdrop`) and not a run. A code search of 2.1.326 finds `Press again to disable` (chunk-nvx1z6pc.js@32795 (2.1.327)), `Chat in main session` (@31112, @44515), `Not published (blocked by a permission setting)` (@31592), and `tengu_jolly_dewdrop` (@15618). The 2.1.327 module holds the frame `<system-reminder>This is a side request from the user (via Claude Code's "You should know" feature)` at chunk-nvx1z6pc.js@40258 and exports `EXPLANATION_LENGTHS` and `FIRST_EXPLANATION_LENGTH` (@10284).
  Basis: read from source (2.1.327 binary, cc-inspect code search, 2026-11-18): `Press again to disable` (chunk-nvx1z6pc.js@32795), `Chat in main session` (@31190, @44593), `Not published (blocked by a permission setting)` (@31670), `tengu_jolly_dewdrop` (@15696). Run-time behaviour is not measured: the gate value is server-side and the side agent needs a paid run.
  Source: chunk-nvx1z6pc.js@15696-44593 (2.1.327; first read in claude 2.1.326 binary); chunk-nvx1z6pc.js@0-94447 (2.1.327; first read in claude 2.1.325 binary); binary grep of /Users/krystian/.local/share/claude/versions/2.1.325, 2026-11-17.
  Verified: re-run on claude 2.1.327, 2026-11-19: 2.1.327 binary: "Press again to disable" x2, "Chat in main session" x4, "Not published (blocked by a permission setting)" x2, tengu_jolly_dewdrop x2, EXPLANATION_LENGTHS x3, FIRST_EXPLANATION_LENGTH x3

## Claude Code Surface and Version Notes CTX-331 to CTX-333

  Verified: source already on 2.1.327; binary string search, claude 2.1.327, 2026-11-19, also finds "Press again to disable" (2 hits), "Chat in main session" (4) and the gate tengu_jolly_dewdrop (2).

- [x] **CTX-331** Claude Code 2.1.326 has these names (checked with cc-inspect `surface` on 2026-11-17; first measured on 2.1.325): env `CLAUDE_CODE_SILENT_TURN_REMINDER_TEXT` (str), `_REMINDER` (triBool), `_SECONDS`, `_TURNS`; gates `tengu_hushed_lark` and `tengu_hushed_lark_text`; hook events Stop, SubagentStop, PreToolUse, PostToolUse, UserPromptSubmit; setting key `sandbox.filesystem.denyRead`; tools AskUserQuestion and Monitor (listed as `MonitorTool`); all of them are present in 2.1.326. Not queried: the `isolation:"worktree"` param, the `tools:` agent frontmatter, `--no-write`, and settings `env` replacement on a tool result.
  Basis: measured. Status: not applicable.
  Source: probe cc-inspect `surface`, claude 2.1.325, 2026-11-16; cc-inspect `surface` env, hook-event, setting, gate, and tool lists, claude 2.1.326, 2026-11-17.
  Verified: binary string search, claude 2.1.327, 2026-11-19: CLAUDE_CODE_SILENT_TURN_REMINDER_TEXT (4 hits),_SECONDS (4), tengu_hushed_lark (3) and tengu_hushed_lark_text (2) are in the bundle; the 2.1.326 name list holds on 2.1.327 for these names.
  Verified: re-run on claude 2.1.327, 2026-11-19: 2.1.327 binary: CLAUDE_CODE_SILENT_TURN_REMINDER_TEXT x4, tengu_hushed_lark x3, tengu_hushed_lark_text x2, sandbox.filesystem.denyRead x2 (item states 2.1.326)

- [x] **CTX-332** Claude Code 2.1.326 has these subagent and worktree names (checked with cc-inspect `surface` on 2026-11-17; first measured on 2.1.325): env `CLAUDE_CODE_SUBAGENT_MODEL`, `_MODEL_FORCE`, `_EFFORT`, `_HISTORY`, `_CACHE_EVICT`, `_PROMPT_CACHE_TTL`, `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS`, `MAX_SUBAGENT_SPAWN_DEPTH`, `MAX_SUBAGENTS_PER_SESSION`, `CLAUDE_ASYNC_AGENT_STALL_TIMEOUT_MS` (int 1..2147483647), `CLAUDE_CODE_FORK_SUBAGENT`, `EXPERIMENTAL_AGENT_TEAMS`, `DISABLE_EXPLORE_PLAN_AGENTS`, `AGENT_PROGRESS_SUMMARIES`, `NO_MODEL_FALLBACK`, `WORKFLOW_MAX_CONCURRENT_AGENTS` (1..256), `SCRIPT_CAPS`. Settings: `worktree.baseRef` (`fresh` default from origin/`<default>`, or `head`), `crossSessionInbound` (accept or hold), `cleanupPeriodDays` (default 30, min 1), `bashOutputMaxChars` (default 30000), `autoCompactWindow`, `switchModelsOnFlag`, `subagentStatusLine` (deprecated, no effect). Hook events: SubagentStart, SubagentStop, WorktreeCreate, WorktreeRemove, TeammateIdle, TaskCreated, TaskCompleted, PreModelSwitch, PostModelSwitch. Tools: Agent, SendMessage, ListAgents, EnterWorktree, ExitWorktree, TaskStop, Workflow. Flag `--max-turns` is hidden and works only with `--print`. None of the names in this theme is absent in 2.1.326. The defaults and ranges are from the 2.1.325 read, except `CLAUDE_ASYNC_AGENT_STALL_TIMEOUT_MS` (int 1..2147483647) and `CLAUDE_CODE_WORKFLOW_MAX_CONCURRENT_AGENTS` (1..256), which match in 2.1.326; on 2.1.327 `surface` env lists `CLAUDE_CODE_SUBAGENT_MODEL`, `_MODEL_FORCE`, `_EFFORT`, `_HISTORY`, `_CACHE_EVICT`, `_PROMPT_CACHE_TTL`, `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS`, `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH` and `CLAUDE_CODE_MAX_SUBAGENTS_PER_SESSION` (chunk-2ew0jg68.js@18809-44271, chunk-qhsv8pnt.js@20627); the spawn-depth default is 3 (chunk-ja9j7x1x.js@341); the other defaults were not re-read.
  Basis: measured. Status: not applicable.
  Source: probe cc-inspect `surface`, claude 2.1.325, 2026-11-16; cc-inspect `surface`, claude 2.1.326, 2026-11-17.
  Verified: binary string search, claude 2.1.327, 2026-11-19: CLAUDE_CODE_SUBAGENT_MODEL_FORCE, _EFFORT,_HISTORY, _CACHE_EVICT, _PROMPT_CACHE_TTL, CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS and MAX_SUBAGENT_SPAWN_DEPTH are all in the bundle (3 to 18 hits each); the settings and flag names were not rechecked.
  Verified: re-run on claude 2.1.327, 2026-11-19: partial: 2.1.327 binary has CLAUDE_CODE_SUBAGENT_MODEL_FORCE, _EFFORT,_HISTORY, _CACHE_EVICT, _PROMPT_CACHE_TTL, MAX_SUBAGENTS_PER_SESSION, CLAUDE_ASYNC_AGENT_STALL_TIMEOUT_MS, CLAUDE_CODE_FORK_SUBAGENT, WORKFLOW_MAX_CONCURRENT_AGENTS, baseRef, crossSessionInbound, cleanupPeriodDays, bashOutputMaxChars, autoCompactWindow, switchModelsOnFlag, TeammateIdle, WorktreeCreate, PreModelSwitch; defaults/ranges not re-checked

- [x] **CTX-333** The `oauthAccount.organizationRateLimitTier` values are `claude_pro`, `default_claude_max_5x`, and `default_claude_max_20x`. The values come from the spec and are not checked against the binary.
  Basis: cited. Status: not applicable.
  Source: verified in the program on 2.1.327: `default_claude_max_5x` (chunk-asj6f58y.js@669513), `default_claude_max_20x` (chunk-8b50zmfk.js@40113); `claude_pro` is a subscription-type value that maps to `pro` (chunk-asj6f58y.js@371893), not a rate-limit tier value, so the plan's tier list for Pro is corrected to the subscription type.
  Verified: not re-run 2026-11-19: item says values come from the spec; static: claude_pro, default_claude_max_5x, default_claude_max_20x all present in 2.1.327 binary

## Claude Code Surface and Version Notes CTX-335

  Verified: source already on 2.1.327.

- [x] **CTX-335** The engine has a hook budget of 10 s per event (docs); a plugin hook past budget twice is unloaded (reported); a `$.http.fetch` wait stops the hook clock even with `$.clock.sleep` raced beside it, has its own 30 s cap, and takes no `signal`; a `tool.check` deny arrives at `tool.call` as `isError`; a PreToolUse allow followed by a check error counts as no answer; `tool.describe` events carry no thread (subagent and main get one Bash text); `$.tool.check({tool:"Read"})` gives the session's verdict; `$.fs.exists` throws on `/\` paths (a grep pattern like `/\.git/` reads as a network location); the 33 classic events agree between docs and types, with 44 mod events. On 2.1.326 (checked: `code` search of each name): `$.http.fetch`, `$.clock.sleep`, `$.tool.check`, `tool.describe`, `$.fs.exists` are present; the 33 classic events are confirmed by `surface` hook-event on 2.1.327 (chunk-ja5z738t.js@5436); the count of 44 mod events was not re-counted.
  Acceptance: Each line is reproduced by a probe on 2.1.326. Verification: probe.
  Basis: measured and cited. Status: have at 088a227c.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/cc-2-1-323.md:15; openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:978; chunk-dafpvz32.js@3461, @3540, @3582, @3722; chunk-ecn8g7cy.js@2430, @2397 (claude 2.1.327 binary). Not located: the hook-clock, 30 s cap, and `$.fs.exists` lines.
  Verified: re-run on claude 2.1.327, 2026-11-19: partial: tool.describe x21, tool.check x47 in 2.1.327 binary; 10 s budget doc-sourced; unload-after-two-overruns stays unconfirmed (see CON-008: binary says only "counted toward a runaway"); 44 mod events not re-counted
  Verified: code read, claude 2.1.327, 2026-11-19: a hook still running after its budget logs hook overran with effect counted toward a runaway (chunk-b0yr0k8v.js@64151); the host counts overruns per plugin and at Gui=2 in a row reports a runaway plugin in the hooks worker with that plugin as culprit (chunk-m14bt1pz.js@4945918, @4932274). So the twice-past-budget rule holds as two overruns in a row.

## Claude Code Surface and Version Notes CTX-336

  Verified: binary string search, claude 2.1.327, 2026-11-19: tool.describe (17 hits), http.fetch (21), clock.sleep (9), tool.check (31) are in the bundle; the timing and verdict behaviours were measured earlier and are not rerun.

- [x] **CTX-336** Plan mode is a permission mode, not a method; newer models need it less; it is useful as a short output for evals (save git hashes and short prompts as cases, blind-review plans).
  Acceptance: Not applicable (context fact). Verification: inspection.
  Basis: reported. Status: missing at 088a227c.
  Source: `plan` is a permission mode on 2.1.327 (the mode list `acceptEdits, auto, bypassPermissions, default, dontAsk, plan`, chunk-k57p2hm4.js@1322). The remaining claims (newer models need it less, use for evals) are opinion; Dropped (2026-11-18): no source located in external/, openspec/, reports/, git history or the user's transcripts.
  Verified: not re-run 2026-11-19: opinion/advice on plan mode; nothing local to run

## Claude Code Surface and Version Notes CTX-339

  Verified: source already on 2.1.327 for the plan permission mode (mode list in chunk-k57p2hm4.js@1322); the eval advice stays reported.

- [x] **CTX-339** Path-scoped rules in `.claude/rules/` with a `paths` glob load only when matching files are touched; `@path` imports still load at launch and only help organization.
  Basis: reported (anecdote; the docs link was not opened).
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/reddit-2.md:159.
  Verified: docs search (clawdipedia-docs), claude 2.1.327, 2026-11-19: "Nested CLAUDE.md files and paths rules load later, when Claude reads a matching file", and the doctor prompt says rules with paths frontmatter load only with matching files; the @path import behaviour is not stated there.
  Verified: not re-run 2026-11-19: path-scoped rule loading not probed here; docs lookup not made
