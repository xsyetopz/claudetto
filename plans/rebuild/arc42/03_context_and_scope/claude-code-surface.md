# claude-code-surface

## Claude Code Surface and Version Notes

- [ ] **CTX-314** Subagents do not respect the user's auto-compact threshold setting.
  Acceptance: Reported by one commenter (autocompact set at 600k), not measured. On 2.1.327 the compact window resolves per model from `CLAUDE_CODE_AUTO_COMPACT_WINDOW`, then settings (chunk-m14bt1pz.js@1995867); no subagent-specific branch was read, and showing that a subagent ignores it needs a long paid session. Verification: paid probe.
  Basis: reported, one commenter.
  Status: n/a (fact).
  Source: external/2026-11-13/reddit.com-r-claudecode-comments-1xubp1v-is-compacting-still-bad-practi-20261113T000651Z.md:203 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xubp1v/is_compacting_still_bad_practice/>)

- [ ] **CTX-315** Hook log fields: `tool_use_id` is on the PreToolUse input and on both post-tool inputs (a retry is a new id; the permission-request input has no tool_use_id); `is_interrupt` on PostToolUseFailure tells a stopped call from an errored one; Stop does not fire on interrupt, and API errors fire StopFailure, so also log StopFailure and SessionEnd; a PreToolUse id still open at Stop goes in a "never resolved" bucket, not counted as failure or denial; a failure does not prove nothing happened; async is for record-only hooks since PreToolUse must stay synchronous to block.
  Acceptance: Each field is checked against claude 2.1.327 before use; `tool_use_id`, `is_interrupt`, `PostToolUseFailure`, and `StopFailure` are present in the 2.1.327 hook input and event list (code search `is_interrupt` at chunk-rj3e7agr.js@271977, `StopFailure` at chunk-rj3e7agr.js@268292), on 2.1.327 `PostToolUse` and `PostToolUseFailure` inputs carry `tool_use_id`, and `PostToolUseFailure` carries `error` and optional `is_interrupt` (chunk-rj3e7agr.js@271977); the PreToolUse and permission-request fields were not re-read. Verification: probe.
  Basis: reported by the author of a recorder tool and commenters; the fields not named in the Acceptance line were not re-read on 2.1.327. The plan holds only "log PostToolUseFailure besides PostToolUse".
  Status: n/a (fact); PostToolUseFailure and is_interrupt appear nowhere in plugins at 088a227c; StopFailure appears in `features/stop-notice`.
  Source: external/2026-11-16/reddit.com-r-claudecode-comments-1xuk52d-if-you-log-claude-codes-hooks-20261116T052718Z.md:37,39,41,67,75,79 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xuk52d/if_you_log_claude_codes_hooks_add/>)

- [ ] **CTX-316** Measured hook effect over 34,053 hook events (Nov 1-12, one poster): when a hook let the action through with a warning, the agent corrected on its next try 36% of the time; when it rejected the action and named the replacement command, 95%.
  Acceptance: Reject only where the move must change (irreversible or expensive), since each rejection costs a step. Verification: inspection.
  Basis: measured by the poster. In a small test a rejection stopped 3 of 3 but the agent took the suggested command 1 of 3; a rejection whose suggested path another rule blocked made the agent invent a path; a context note injected before a command did not stop it (3 of 3 ran).
  Status: n/a (fact).
  Source: external/2026-11-16/reddit.com-r-claudecode-comments-1xvc77s-i-rewrote-my-claude-code-sessi-20261116T051759Z.md:75,77,79 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xvc77s/i_rewrote_my_claude_code_session_rules_41_times/>)

- [ ] **CTX-317** Auto memory's "feedback" note type is corrections plus approaches the user confirmed, so telling Claude "it works" is a signal it saves; the first 200 lines of the MEMORY.md index load each session.
  Acceptance: Say "remember that" for what matters and check /memory. Verification: inspection.
  Basis: reported (reported by a commenter citing docs, not measured; a constant 200 sits next to `MEMORY.md` handling at chunk-m14bt1pz.js@1644617, but its use as the index line limit was not read).
  Status: n/a (fact).
  Source: external/2026-11-16/reddit.com-r-claudecode-comments-1xvcy0y-tip-take-the-time-to-say-it-wo-20261116T052243Z.md:93,97 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xvcy0y/tip_take_the_time_to_say_it_works_to_claude_after/>)

- [ ] **CTX-318** Account-level experiments can change the model behind one model string.
  Acceptance: "Feels like a different model" can be a different model; the experiment ID is saved in the session logs. Verification: probe.
  Basis: reported, one commenter: account in "experiment 763" from Nov 1 to 6, during which claude-opus-5-5 knew news from late May 2026 that it does not know outside the experiment; same-week reports of extra unrequested additions, ignored CLAUDE.md and uppercase Go error strings from Fable 5.2.
  Status: n/a (fact).
  Source: external/2026-11-16/reddit.com-r-claudecode-comments-1xvfbtd-opus-55-not-working-well-today-20261116T051607Z.md:57,59,95 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xvfbtd/opus_55_not_working_well_today/>)

- [ ] **CTX-319** Long-session evidence from one poster's five longest sessions (29 to 54 h): three never compacted and peaked at 425k-490k; one auto compaction fired at 323k (Opus 5.5, CLI 2.1.322) while a same-model 54 h session on 2.1.321/2.1.322 reached 480k without one; the 36.5 h session's three drops (621k, 469k, 539k down to 32k-43k) were manual /compact.
  Acceptance: A flat per-request average mixes compacted sessions with slow climbers; model or version did not separate them; `compact_boundary` in the JSONL logs trigger and preTokens but not the threshold. Verification: inspection.
  Basis: measured by the poster.
  Status: n/a (fact).
  Source: external/2026-11-16/reddit.com-r-claudecode-comments-1xvr4ob-i-grouped-18629-claude-code-re-20261116T051613Z.md:57,65,67,71 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xvr4ob/i_grouped_18629_claude_code_requests_by_session/>)

- [ ] **CTX-320** A CLAUDE.md prose pointer "look at AGENTS.md" is compacted with the conversation, while an `@AGENTS.md` import is re-read verbatim and not diluted.
  Acceptance: Split files need a "read X before task Y" line so they are re-read after compaction. Verification: probe.
  Basis: reported, inferred, one commenter; compaction named factor 1 of instruction drift.
  Status: n/a (fact).
  Source: external/2026-11-16/reddit.com-r-claudecoding-comments-1xw8w8b-tldr-are-people-here-actuall-20261115T135227Z.md:96,97 (url: <https://www.reddit.com/r/ClaudeCoding/comments/1xw8w8b/tldr_are_people_here_actually_using_skills_via/>)

## Claude Code Surface and Version Notes

- [ ] **CTX-321** CLAUDE_CODE_HOOK_HEARTBEAT_INTERVAL_MS takes 100 to 30000 ms. A hook heartbeat (note 6) means the status-line heartbeat file needs review.
  Basis: cited.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/cc-2-1-323.md:38.

- [ ] **CTX-322** CLAUDE_CODE_OVERLOADED_RETRY_MAX_DELAY_MS (up to 300000) and CLAUDE_CODE_OVERLOADED_RETRY_MAX_WAIT_MS (gated) exist. They bear on the retry and backoff cure for runs lost to an API error.
  Basis: cited.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/cc-2-1-323.md:40.

- [ ] **CTX-323** $.session.model() inside prompt.section is the per-model prompt route. The SessionStart input model was absent in a -p start, so claudetto shall not rely on it.
  Basis: cited, and observed for the absent field.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/cc-2-1-323.md:70-71.

- [ ] **CTX-324** /usage flags sessions with requests in 8 or more hours, which matches the long-session violation.
  Basis: cited.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/cc-2-1-323.md:42.

## Claude Code Surface and Version Notes

- [ ] **CTX-325** In Claude Code 2.1.327 the builtin `cc-plugin-you-should-know` (chunk-nvx1z6pc.js) sets `isAvailable` to `(S3e()||false) && !xo("hipaa") && !xo("zdr") && !xo("ldr") && b(Wo(), Rn)`. `S3e` returns `verdict.complianceTaintsSettled()` or false (chunk-2mhcazb3.js@2480; the verdict is registered at chunk-6z86r3hs.js@37719). `xo(name)` is `taints.includes(name)` (chunk-2mhcazb3.js@1692), so the builtin is off when the taint set holds hipaa, zdr, or ldr. `Wo()` is the gate name `tengu_jolly_dewdrop` (chunk-nvx1z6pc.js@15696) and `Rn` is its default, false (chunk-nvx1z6pc.js@89762). The earlier 2.1.326 search missed the call because it looked in chunk-na8s6d5h.js, a module name that changed; the builtin lives in chunk-nvx1z6pc.js in 2.1.327.
  Basis: read from source (2.1.327 binary, cc-inspect code search, 2026-11-18); the run-time outcome of the gate depends on server-side gate state, which the binary does not hold.
  Source: chunk-nvx1z6pc.js@3402, @15696, @89762 (claude 2.1.327 binary); chunk-2mhcazb3.js@1692, @2480 (claude 2.1.327 binary); chunk-6z86r3hs.js@37719 (claude 2.1.327 binary); chunk-2mhcazb3.js@642-2480 (2.1.327; first read in claude 2.1.326 binary); chunk-6z86r3hs.js@37719 (2.1.327) (claude 2.1.326 binary); chunk-jc1ynf6x.js@92000-94036 and @92500 (claude 2.1.325 binary, not located in 2.1.326).

- [ ] **CTX-326** In 2.1.327 the builtin registers with `rp=()=>NE({...Dn,defaultEnabled:false,hooksModule:Qz(import.meta.dir,Et,()=>gs())})` (chunk-nvx1z6pc.js@90045): `defaultEnabled` is false and the hooks module comes from `Qz`. Hook-argument shapes for the requirements in `prd/you-should-know.md` are read from the mod API declarations: `HooksModule`, `PluginRegisterInput`, `PluginRegisterResult` and `PluginRegisterUses` appear in the types list (clawdipedia get_schema "types", 2026-11-18), and the telemetry plugin registers with `NE({...V,hooksModule:e})` (chunk-g8ypxj28.js@32179). Offsets from 2.1.327: chunk-syz79m2z.js@1000-1700 registers `cc-plugin-you-should-know` and loads chunk-nvx1z6pc.js, and a search for `hooksModule` finds only hook-state keys (chunk-asj6f58y.js@15431).
  Basis: read from source (2.1.327 binary, cc-inspect code search, 2026-11-18) and cited (clawdipedia get_schema "types", 2026-11-18). The bodies of `NE` and `Qz` are host registration plumbing that no claudetto requirement calls.
  Source: chunk-nvx1z6pc.js@90045 (claude 2.1.327 binary); chunk-syz79m2z.js@1000-1700 (2.1.327; first read in claude 2.1.326 binary); chunk-asj6f58y.js@15431 (2.1.327) (claude 2.1.326 binary); chunk-jc1ynf6x.js@92000-94036 (claude 2.1.325 binary, not located in 2.1.326).

- [ ] **CTX-327** The `learn_page` flow is unreachable because no code creates a `making` view. In 2.1.327 the kind `making` appears only in the view validator (chunk-nvx1z6pc.js@34011), the clear-on-session-change test (@34691), and the renderer (@86756); no `kind:"making"` write exists in the module. The `learn_page` telemetry event is at @20047 and @22313, and `pageHtml` is exported at @93521. `Tn` is the export `proposePrompt`, the offer-proposal prompt, not a page-writing prompt.
  Basis: read from source (2.1.327 binary, cc-inspect code search, 2026-11-18). The page-writing text is not transcribed because the flow is unreachable and no claudetto requirement uses it.
  Source: chunk-nvx1z6pc.js@20047 (2.1.327), @22313, @34011, @34691, @86756, @93521 (claude 2.1.327 binary); chunk-nvx1z6pc.js@20047-44593 (claude 2.1.326 binary); chunk-jc1ynf6x.js@37400-73000 (claude 2.1.325 binary).

- [ ] **CTX-328** `closedOfferRows`, the `aboutFit` budgets and the exact desktop hover-card element props are read in 2.1.327. `aboutFit` (`sr`, chunk-nvx1z6pc.js@18025) returns the About note only when the About copy fits the row budget (`scrolls` budgets always fit); `closedOfferRows` is `Mt=(e)=>Pe(tr(e.tag)+e.line,e)`, the row count of the tagged offer line plus its choices (@18025). The desktop hover card `aboutCard` (`At`, @15696) is an absolutely positioned box (bottom 1, left 0, hidden until hover, round dim border, paddingX 1, width 60).
  Basis: read from source (2.1.327 binary, cc-inspect code search, 2026-11-18).
  Source: chunk-nvx1z6pc.js@15696, @18025 (claude 2.1.327 binary); chunk-nvx1z6pc.js@8612-92299 (2.1.327) (claude 2.1.326 binary); chunk-nvx1z6pc.js@81411-90078 (2.1.327; first read in claude 2.1.325 binary).

- [ ] **CTX-329** In 2.1.327 `USER_TYPE==="external"` hides the About copy as well as the Disable button. The module reads env `USER_TYPE` (declared in the env reads list, chunk-nvx1z6pc.js@6537), tests it with `ln=(e)=>e==="external"` (@36997), and stores the result as `M` (@83352). `M` is passed as the third argument of `aboutFrame` (`ir`), which returns `copy:[]` when it is true (@88869 and the `ir` definition at @18025), and it joins the desktop test in `Nn=Ee(a.surface)||M` (@88538). The literal `USER_TYPE==="external"` is absent from the module because of the `ln` helper.
  Basis: read from source (2.1.327 binary, cc-inspect code search, 2026-11-18).
  Source: chunk-nvx1z6pc.js@6537, @18025, @36997, @83352, @88538, @88869 (claude 2.1.327 binary); chunk-nvx1z6pc.js@81411-90078 (2.1.327; first read in claude 2.1.325 binary).

- [ ] **CTX-330** The statements about You should know are read from code. A run of the builtin needs the server-side gate `tengu_jolly_dewdrop` on and a live model fork, so no fake-API run reaches it. A grep of the 2.1.325 binary found the quoted strings (the frame, the length lines, `Press again to disable`, `Chat in main session`, `Not published (blocked by a permission setting)`, `tengu_jolly_dewdrop`) and not a run. A code search of 2.1.326 finds `Press again to disable` (chunk-nvx1z6pc.js@32795 (2.1.327)), `Chat in main session` (@31112, @44515), `Not published (blocked by a permission setting)` (@31592), and `tengu_jolly_dewdrop` (@15618). The 2.1.327 module holds the frame `<system-reminder>This is a side request from the user (via Claude Code's "You should know" feature)` at chunk-nvx1z6pc.js@40258 and exports `EXPLANATION_LENGTHS` and `FIRST_EXPLANATION_LENGTH` (@10284).
  Basis: read from source (2.1.327 binary, cc-inspect code search, 2026-11-18): `Press again to disable` (chunk-nvx1z6pc.js@32795), `Chat in main session` (@31190, @44593), `Not published (blocked by a permission setting)` (@31670), `tengu_jolly_dewdrop` (@15696). Run-time behaviour is not measured: the gate value is server-side and the side agent needs a paid run.
  Source: chunk-nvx1z6pc.js@15696-44593 (2.1.327; first read in claude 2.1.326 binary); chunk-nvx1z6pc.js@0-94447 (2.1.327; first read in claude 2.1.325 binary); binary grep of /Users/krystian/.local/share/claude/versions/2.1.325, 2026-11-17.

## Claude Code Surface and Version Notes

- [ ] **CTX-331** Claude Code 2.1.326 has these names (checked with cc-inspect `surface` on 2026-11-17; first measured on 2.1.325): env `CLAUDE_CODE_SILENT_TURN_REMINDER_TEXT` (str), `_REMINDER` (triBool), `_SECONDS`, `_TURNS`; gates `tengu_hushed_lark` and `tengu_hushed_lark_text`; hook events Stop, SubagentStop, PreToolUse, PostToolUse, UserPromptSubmit; setting key `sandbox.filesystem.denyRead`; tools AskUserQuestion and Monitor (listed as `MonitorTool`); all of them are present in 2.1.326. Not queried: the `isolation:"worktree"` param, the `tools:` agent frontmatter, `--no-write`, and settings `env` replacement on a tool result.
  Basis: measured. Status: not applicable.
  Source: probe cc-inspect `surface`, claude 2.1.325, 2026-11-16; cc-inspect `surface` env, hook-event, setting, gate, and tool lists, claude 2.1.326, 2026-11-17.

- [ ] **CTX-332** Claude Code 2.1.326 has these subagent and worktree names (checked with cc-inspect `surface` on 2026-11-17; first measured on 2.1.325): env `CLAUDE_CODE_SUBAGENT_MODEL`, `_MODEL_FORCE`, `_EFFORT`, `_HISTORY`, `_CACHE_EVICT`, `_PROMPT_CACHE_TTL`, `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS`, `MAX_SUBAGENT_SPAWN_DEPTH`, `MAX_SUBAGENTS_PER_SESSION`, `CLAUDE_ASYNC_AGENT_STALL_TIMEOUT_MS` (int 1..2147483647), `CLAUDE_CODE_FORK_SUBAGENT`, `EXPERIMENTAL_AGENT_TEAMS`, `DISABLE_EXPLORE_PLAN_AGENTS`, `AGENT_PROGRESS_SUMMARIES`, `NO_MODEL_FALLBACK`, `WORKFLOW_MAX_CONCURRENT_AGENTS` (1..256), `SCRIPT_CAPS`. Settings: `worktree.baseRef` (`fresh` default from origin/<default>, or `head`), `crossSessionInbound` (accept or hold), `cleanupPeriodDays` (default 30, min 1), `bashOutputMaxChars` (default 30000), `autoCompactWindow`, `switchModelsOnFlag`, `subagentStatusLine` (deprecated, no effect). Hook events: SubagentStart, SubagentStop, WorktreeCreate, WorktreeRemove, TeammateIdle, TaskCreated, TaskCompleted, PreModelSwitch, PostModelSwitch. Tools: Agent, SendMessage, ListAgents, EnterWorktree, ExitWorktree, TaskStop, Workflow. Flag `--max-turns` is hidden and works only with `--print`. None of the names in this theme is absent in 2.1.326. The defaults and ranges are from the 2.1.325 read, except `CLAUDE_ASYNC_AGENT_STALL_TIMEOUT_MS` (int 1..2147483647) and `CLAUDE_CODE_WORKFLOW_MAX_CONCURRENT_AGENTS` (1..256), which match in 2.1.326; on 2.1.327 `surface` env lists `CLAUDE_CODE_SUBAGENT_MODEL`, `_MODEL_FORCE`, `_EFFORT`, `_HISTORY`, `_CACHE_EVICT`, `_PROMPT_CACHE_TTL`, `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS`, `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH` and `CLAUDE_CODE_MAX_SUBAGENTS_PER_SESSION` (chunk-2ew0jg68.js@18809-44271, chunk-qhsv8pnt.js@20627); the spawn-depth default is 3 (chunk-ja9j7x1x.js@341); the other defaults were not re-read.
  Basis: measured. Status: not applicable.
  Source: probe cc-inspect `surface`, claude 2.1.325, 2026-11-16; cc-inspect `surface`, claude 2.1.326, 2026-11-17.

- [ ] **CTX-333** The `oauthAccount.organizationRateLimitTier` values are `claude_pro`, `default_claude_max_5x`, and `default_claude_max_20x`. The values come from the spec and are not checked against the binary.
  Basis: cited. Status: not applicable.
  Source: verified in the program on 2.1.327: `default_claude_max_5x` (chunk-asj6f58y.js@669513), `default_claude_max_20x` (chunk-8b50zmfk.js@40113); `claude_pro` is a subscription-type value that maps to `pro` (chunk-asj6f58y.js@371893), not a rate-limit tier value, so the plan's tier list for Pro is corrected to the subscription type.

## Claude Code Surface and Version Notes

- [ ] **CTX-335** The engine has a hook budget of 10 s per event (docs); a plugin hook past budget twice is unloaded (reported); a `$.http.fetch` wait stops the hook clock even with `$.clock.sleep` raced beside it, has its own 30 s cap, and takes no `signal`; a `tool.check` deny arrives at `tool.call` as `isError`; a PreToolUse allow followed by a check error counts as no answer; `tool.describe` events carry no thread (subagent and main get one Bash text); `$.tool.check({tool:"Read"})` gives the session's verdict; `$.fs.exists` throws on `/\` paths (a grep pattern like `/\.git/` reads as a network location); the 33 classic events agree between docs and types, with 44 mod events. On 2.1.326 (checked: `code` search of each name): `$.http.fetch`, `$.clock.sleep`, `$.tool.check`, `tool.describe`, `$.fs.exists` are present; the 33 classic events are confirmed by `surface` hook-event on 2.1.327 (chunk-ja5z738t.js@5436); the count of 44 mod events was not re-counted.
  Acceptance: Each line is reproduced by a probe on 2.1.326. Verification: probe.
  Basis: measured and cited. Status: have at 088a227c.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/cc-2-1-323.md:15; openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:978; chunk-dafpvz32.js@3461, @3540, @3582, @3722; chunk-ecn8g7cy.js@2430, @2397 (claude 2.1.327 binary). Not located: the hook-clock, 30 s cap, and `$.fs.exists` lines.

## Claude Code Surface and Version Notes

- [ ] **CTX-336** Plan mode is a permission mode, not a method; newer models need it less; it is useful as a short output for evals (save git hashes and short prompts as cases, blind-review plans).
  Acceptance: Not applicable (context fact). Verification: inspection.
  Basis: reported. Status: missing at 088a227c.
  Source: `plan` is a permission mode on 2.1.327 (the mode list `acceptEdits, auto, bypassPermissions, default, dontAsk, plan`, chunk-k57p2hm4.js@1322). The remaining claims (newer models need it less, use for evals) are opinion; Dropped (2026-11-18): no source located in external/, openspec/, reports/, git history or the user's transcripts.

## Claude Code Surface and Version Notes

- [ ] **CTX-337** With remote control enabled Claude Code puts a link to the conversation in the commit message, and commenters add that author emails always get committed.
  Acceptance: The facts hold as two commenters report them. Verification: probe.
  Basis: reported, commenters. Status: unchecked: a fact about Claude Code or the machine, with no baseline code to check.
  Source: external/2026-11-03/reddit.com-r-claudecode-comments-1xg1zev-this-tweet-is-a-scary-truth-20261102T184325Z.md:61; external/2026-11-03/reddit.com-r-claudecode-comments-1xg1zev-this-tweet-is-a-scary-truth-20261102T184325Z.md:57 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xg1zev/this_tweet_is_a_scary_truth/>).

## Claude Code Surface and Version Notes

- [ ] **CTX-338** A poster's subagent limits are 60 tool calls, a 100K-token soft handoff and a 150K hard limit; another poster's hook caps 20 agents per session.
  Basis: reported (anecdote).
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/reddit-2.md:134; openspec/changes/archive/2026-11-16-2-1-323/research/reddit-2.md:138.

- [ ] **CTX-339** Path-scoped rules in `.claude/rules/` with a `paths` glob load only when matching files are touched; `@path` imports still load at launch and only help organization.
  Basis: reported (anecdote; the docs link was not opened).
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/reddit-2.md:159.

- [ ] **CTX-340** Hook denial counts in the audited sessions: "Use Read, not the shell" 60 (claudetto), 184 (OpenSAD subagents), 88 (OpenJoystickDriver); "Use Write, not the shell" 34 and 199; "Worktree not created by this session" 48 and 13; "User remarked or asked; requested no work" 28, 21, 64 and 12; pkill or loop limit 16+16; the 15-minute agent limit 20 in OpenSAD subagents; pipe without pipefail 13 in subagents.
  Basis: measured (counted from session logs).
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/sessions.md:59-66.

- [ ] **CTX-341** About 207 turns were lost to retries after denials in claudetto sessions (inferred), and the HooksError "was not resolved" from `$.fs.stat` on non-path Bash operands showed 224 lines from `useSetup/rules.ts:93` in OpenJoystickDriver and 1,818 in the audited session itself.
  Basis: measured (counted; the 207 turns inferred).
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/sessions.md:72-73.

- [ ] **CTX-342** The biggest sessions by cache read: claudetto 5709ef73 with 1,199 turns and 101.8M, clawdipedia 76585f31 with 1,508 turns and 133.6M, OpenJoystickDriver with about 1,400 turns and 114-124M; `design.md` was read 34 and 58 times in two claudetto sessions; persisted-output shows 0-3 hits per session, so it is not a driver.
  Basis: measured (counted).
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/sessions.md:79-90.

- [ ] **CTX-343** Compaction sizes: claudetto 120 compactions, all auto, at 140-145k before and 18-22k after; OpenSAD 67 at 140-150k before, 8-26k after and 15-44k re-cache; one OpenSAD session compacted 15 times in 3 hours.
  Basis: measured (counted).
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/sessions.md:108-113.

- [ ] **CTX-344** Four outside sources that call built-in compaction expensive were read on 2026-10-28 and none changed a value: the only one with a real sample fits its band on a window near 1M against the 300,000 this project sets, and the most-quoted figure (about $3.00 per compaction) appears in no source read.
  Basis: reported (spec).
  Source: openspec/specs/compaction-path/spec.md:68.

- [ ] **CTX-345** Measured on 2.1.319 with `claude-sonnet-5-5` and 32 held-out prompts per arm: the output-style checkbox line 21/32 (Wilson 0.483-0.796), the strict form 2/32 (0.017-0.201), the heading 20/32; base 0/32 on all three; total $2.21 and 1,316,831 tokens. The Write tool was denied by `--permission-mode default`, which inflates the checkbox count; only 7/32 plugin replies had a `!` command in a checkbox item; no rerun with write permission.
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/evidence/18-8/README.md:20-36.

- [ ] **CTX-346** Run 1 of the 18-23 test (Read text in context): turns 3.97 against base 3.00, output 692.2 against 355.8 (1.95x), 0.43 Stop blocks per session. Run 2 (text in stdout, 60 sessions, $2.61): turns 3.43 against 3.13 (1.096), job-op calls 4.20 against 4.47 (0.94), output 551.8 against 378.3 (1.46x, which misses the 1.25x bound), fixes 30/30 in both arms, 0 denials. The Stop block "names something the user has not seen" fired in 10 of 30 plugin sessions; those averaged 918.9 output tokens and 4.30 turns and the other 20 averaged 368.3 and 3.00. The cause (the grader reads the first `RESULT_CHARS` of each tool result) is not tested; it is moot for the rebuild, because ADR-0104 drops the Stop claim grader.
  Basis: measured (the cause is untested and concerns the dropped grader, ADR-0104).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/evidence/18-23/README.md:15-38.

- [ ] **CTX-347** `ours.sh` lists only the folder whose `.created-by-claudetto` holds this session's id; the mutant without the id check also lists other folders. `/tmp` is a link to `/private/tmp`, so `find` needs `-H` to list the seven `/tmp/probe-*` folders.
  Basis: measured (2026-11-07).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/evidence/18-11/README.md:5-15.
