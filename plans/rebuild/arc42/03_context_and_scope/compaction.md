# Compaction

## Compaction and Context Thresholds

- [ ] **CTX-443** Reported by a commenter (poster on 2.1.241 lacked the field): PreCompact can block compaction (exit 2 or {"decision":"block"}); a proactive auto compact is then skipped, but if the API already returned the context-limit error, blocking makes the request fail. A trigger auto/manual field exists since 2.1.290, so one can block auto and run a manual /compact with "keep every decision and rejected option verbatim". Checked in claude 2.1.327 with cc-inspect `code` search for `compact_summary`: the PreCompact hook input carries `trigger` "manual" or "auto" (chunk-rj3e7agr.js@277959). On 2.1.327 a blocked PreCompact hook result returns `blockedBy` with the hook command and its output (chunk-m14bt1pz.js@4116467-4117400); how exit 2 and `{"decision":"block"}` map to `blocked` was not read.
  Basis: reported; the trigger field measured in the 2.1.326 binary; exit 2 blocking verified by fake-API probe, 2026-11-18 (a PreCompact hook exiting 2 made `/compact` return "Compaction blocked by PreCompact hook"); the `{"decision":"block"}` form blocks too (probe 2026-11-18, probes-open-five/probe3: a PreCompact command hook printing `{"decision":"block","reason":"probe-json-block"}` made `/compact` return "Compaction blocked by PreCompact hook: ...: probe-json-block"); auto-compaction honours the block by code read, not probe (runner `_Ye` returns `blockedBy`, chunk-m14bt1pz.js@4116436; auto path @2626495 and precompute path @3004070 skip; reactive compact @2626737 skips with "Reactive compact blocked by PreCompact hook" except when `requestCannotGoOut && CLAUDE_CODE_REMOTE && tengu_typed_snail`, chunk-6ydtrx6k.js@1892), and `settingsHooksOff` disables the block.
  Source: external/2026-10-22/reddit.com-r-claudecode-comments-1xbfly6-60-compactions-into-one-claude-20261022T003216Z.md:237 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xbfly6/60_compactions_into_one_claude_code_session_the/>); claude 2.1.327 binary chunk-rj3e7agr.js@277959.

## Compaction and Context Thresholds

- [ ] **CTX-444** Reported: PreCompact is a shell command whose output never reaches Claude or the summary; PostCompact receives the new summary as compact_summary, so a script can check each generation against the decision log; hook output over 10,000 characters is swapped for a file path plus a 2,000-character preview that Claude is not asked to read. Checked in claude 2.1.327 with cc-inspect `code` search for `compact_summary`: the PostCompact input has `compact_summary` ("The conversation summary produced by compaction") (chunk-rj3e7agr.js@277959). Corrected on 2.1.327: PreCompact hook output over 10,000 characters (`Ake=1e4`, chunk-ez3vve9s.js@340) is cut in place and gets a note "output cut: N characters is over the 10000-character limit" (chunk-m14bt1pz.js@4116467, @4116900); no file path or 2,000-character preview is made for PreCompact. The constant `f3e=2000` sits beside `Ake` and serves other hook output.
  Basis: reported; the PostCompact field measured in the 2.1.326 binary, the rest reported.
  Source: external/2026-10-22/reddit.com-r-claudecode-comments-1xbfly6-60-compactions-into-one-claude-20261022T003216Z.md:364 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xbfly6/60_compactions_into_one_claude_code_session_the/>); claude 2.1.327 binary chunk-rj3e7agr.js@277959.

## Compaction and Context Thresholds

- [ ] **CTX-445** Audit of one user's transcripts: 72% of input was Claude re-reading context past 400k tokens (method unstated).
  Basis: reported, one user, method unstated.
  Source: external/2026-10-22/reddit.com-r-claudecode-comments-1xbfly6-60-compactions-into-one-claude-20261022T003216Z.md:266 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xbfly6/60_compactions_into_one_claude_code_session_the/>).

## Compaction and Context Thresholds

- [ ] **CTX-446** Four outside sources that claim built-in compaction is expensive were read on 2026-10-28. None changed a value, because the only one with a real sample fits its band on a window near 1M against the project's 300,000, and the often-quoted figure of about $3.00 per compaction appears in no source read
  Basis: reported.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/specs/compaction-path/spec.md:27.

## Compaction and Context Thresholds

- [ ] **CTX-447** Auto-compact fires at the window minus 13,000 (warning 20,000 before, hard block at the window minus 3,000). The haiku-5-5 980,000 window gives 967,000. `compact_boundary` records show 967k-983k in, 11k-15k out, 72-237 s each
  Conflict: The merged 6:302 group (merged/004.md) measured on 2.1.325 that real compaction runs at 490,000 on haiku-5-5 while the reported threshold is 967,000; this item says auto-compact fires at 967,000 on the 980,000 window. Probe 2026-11-17 (2.1.326, cc-inspect `cli` `/context`, model claude-haiku-5-5, API key, no settings): window 1m, autocompact buffer 33k, so the default threshold is 967,000; 490,000 needs a smaller resolved window, whose source (env, settings, client data, experiment, model default) the 2.1.325 run did not record (`resolveAutoCompactWindow` sources, chunk-rj3e7agr.js@618658 (2.1.327)).
  Basis: cited.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1580.

- [ ] **CTX-448** `/autocompact [auto|tokens]` writes `modelSettings.<model>.autoCompactWindow` in user settings; "auto" clears it; 0 request text. Proposed: set it in settings so it is checked in
  Basis: cited.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1586.

## Compaction and Context Thresholds

- [ ] **CTX-449** Paid four-arm handover probe, run 2 (18 runs, cost by total_cost_usd, last value per session): A $1.59-1.83, B35 $1.55-3.23, B45 $1.49-1.90, B53 $1.52-1.77, C $0.88-1.66, D $2.87-3.47. No B arm cost less than C in all 3 pairs. Run 1's $13.52 summed every running total, so it overstates cost.
  Basis: measured.
  Source: openspec/changes/archive/2026-11-10-release-2-1-319-1/design.md:160.

- [ ] **CTX-450** Paid probe run 1 (18 runs) was invalid, and its numbers show the span: peak main context per run 35,591-59,957, growth about 1,000 tokens a turn, about 65,000 by turn 40. Thresholds must sit inside 25,000-65,000 for any arm to fire, so B70 and C could not fire at 140,000. The 17-of-18 firing came after thresholds were set inside that span.
  Basis: measured.
  Source: openspec/changes/archive/2026-11-10-release-2-1-319-1/design.md:159.

- [ ] **CTX-451** The within-1% band for the 140,000 threshold, the 213,846-token Haiku window, and the vendor "70% less" claim (read 2026-10-28) are the basis of the tier numbers.
  Basis: measured and cited.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/specs/tier-profiles/spec.md:73,85.

- [ ] **CTX-452** Read-window study 2.12: accuracy and cost tables over 1,985,569 tokens, $3.2949.
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:41.

- [ ] **CTX-453** Cache-prefix study 2.9: 7,716 requests and 111 prefix breaks, 108 of them after compact.
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:36.

- [ ] **CTX-454** Swift 6.4 with the Xcode macOS SDK has no YAML decoder (YAMLDecoder does not compile; JSON and plist decode through Codable), so a Swift reader cannot parse YAML files directly.
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/vanilla-research.md:27.

- [ ] **CTX-455** The /goal modes were read from the program: supportsNonInteractive. A command.run hook for goal that answers without next() replaces the built-in /goal. A quoted "/goal set" and "/goal-set" are rejected.
  Basis: read, not run.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/vanilla-research.md:186-189.

## Compaction and Context Thresholds

- [ ] **CTX-456** Community reports on what survives compaction: root CLAUDE.md and unscoped rules are re-read after compaction; scoped rules, mid-session instructions, and hook output become summary paraphrase. A post found 2 of 8 compactions dropped a skill body (v2.1.285, `-p --resume` only) and compact-hook output attached in 4 of 4 tests. Bug #15174 (compact matcher output not injected) was closed (reported, anecdote).
  Basis: reported, anecdote.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/evidence/tmp/research-syc-community.md:26.

- [ ] **CTX-457** Other community reports, from search snippets only: issue #4017 claims a rule is violated "100% of the time after compaction"; Cursor staff say many loaded rules cost context, so keep each rule file under 500 lines and scope rules to files; a Cline Memory Bank re-read has token and staleness costs (reported, snippet).
  Basis: reported, snippet.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/evidence/tmp/research-syc-community.md:12-14; openspec/changes/archive/2026-11-09-release-2-1-319/evidence/tmp/research-syc-community.md:27; openspec/changes/archive/2026-11-09-release-2-1-319/evidence/tmp/research-syc-community.md:28.

## Compaction and Context Thresholds

- [ ] **CTX-458** Compaction replaces the window with a summary of a few thousand tokens, not tens of thousands. On claude 2.1.327 a manual `/compact` cut about 122k to 3.2k and about 17k to 3.6k tokens, and auto-compaction cut sessions of about 714k to 4k-6k. A third-party reading of `isCompactSummary` transcript lines found summaries of about 14,500 characters (about 3.5k tokens). One user's figure of about 64k after a 375k-token load is refuted for this version; a 375k-token input still leaves a few thousand tokens of summary, so the handover file, not the summary, carries the detail.
  Basis: measured (paid runs, reports/2026-11-18-research/paid-labs/README.md:61-75 and :140-146); the 3.5k figure is reported (third-party, numbers shown); the 64k figure is reported, one user, and refuted. Status: not applicable (outside fact).
  Source: external/2026-11-06/reddit.com-r-claudecode-comments-1xo6dfy-thanks-to-two-lines-in-the-cla-20261105T084836Z.md:281-283 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xo6dfy/thanks_to_two_lines_in_the_claude_setting_i_was/>); external/export-How often do you compact your sessions- What are some PRO compacting tips-.jsonl:92; reports/2026-11-18-research/paid-labs/README.md:61-75; reports/2026-11-18-research/paid-labs/README.md:140-146.

- [ ] **CTX-459** One user's own monitoring found 130k tokens the most cost-effective point to clear; the app injects a save-progress-to-disk request, then clears and continues, with auto-compact off.
  Basis: reported, one user, no figures. Status: not applicable (outside fact).
  Source: external/2026-11-06/reddit.com-r-claudecode-comments-1xo6dfy-thanks-to-two-lines-in-the-cla-20261105T084836Z.md:516 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xo6dfy/thanks_to_two_lines_in_the_claude_setting_i_was/>).

- [ ] **CTX-460** Settings rationale given for 300k and 75: below 300k summaries lose detail, above it context cost creeps; 75 leaves the agent room to write the compact, while 80-100 fumbles and below 75 compacts too often.
  Basis: reported, one user, 20 USD plan, no measures. Status: not applicable (outside fact).
  Source: external/2026-11-06/reddit.com-r-claudecode-comments-1xo6dfy-thanks-to-two-lines-in-the-cla-20261105T084836Z.md:53-54 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xo6dfy/thanks_to_two_lines_in_the_claude_setting_i_was/>).

## Compaction and Context Thresholds

- [ ] **CTX-461** One commenter, citing a GitHub issue (98747), reports idle compaction, in since 2.1.290 and undocumented at the time: it fires at 90 percent of the cache TTL and only when the cache lifetime is 1 hour; the minimum-token floor (env CLAUDE_CODE_IDLE_COMPACT_MIN_TOKEN) defaults to 200k and the server may lower it to 100k, presumably at peak hours, with no word on whether a user value can be overridden the same way. idleCompaction false turns it off, but the cache still expires and the next message rewrites the whole context. autoCompactEnabled false also turns it off but also stops threshold auto-compaction. Compaction uses the session model unless configured otherwise, not Haiku, per issue 29550. The same commenters report the message "Compacted while idle, before the prompt cache expired"; one post doubted it could be turned off, which the `idleCompaction` setting refutes. `/autocompact <n>` values named are 250k, 272k, 400k and 450k ("will double your usage", unverified); a claim that Anthropic docs name 250k is unsourced.
  Acceptance: The facts hold as commenters report them. Checked on claude 2.1.326 by binary string search: setting `idleCompaction`, `autoCompactWindow`, `/autocompact`, flag `--autocompact` and `CLAUDE_CODE_AUTO_COMPACT_WINDOW` are present, and only the plural `CLAUDE_CODE_IDLE_COMPACT_MIN_TOKENS` exists; the release notes name idle compaction; verified on 2.1.327 (chunk-m14bt1pz.js@2128112-2129300): the idle timer fires at 0.9 of the span from last activity to cache expiry (`BZr=0.9`), arms only for a 1-hour cache TTL (`not_one_hour` otherwise), and compacts only above a floor of `max(1e5, ...)` tokens read through `oHn()` (default `tHn=1e5`). Verification: probe.
  Basis: reported, commenters; cited (issues, secondhand); the presence of the settings is read from the 2.1.326 binary. Status: unchecked: a fact about Claude Code or the machine, with no baseline code to check.
  Source: external/2026-11-02/reddit.com-r-claudeai-comments-1x1a6ym-claude-code-compacts-automatical-20261102T070932Z.md:72; external/2026-11-02/reddit.com-r-claudeai-comments-1x1a6ym-claude-code-compacts-automatical-20261102T070932Z.md:74; external/2026-11-02/reddit.com-r-claudeai-comments-1x1a6ym-claude-code-compacts-automatical-20261102T070932Z.md:92; external/2026-11-02/reddit.com-r-claudeai-comments-1x1a6ym-claude-code-compacts-automatical-20261102T070932Z.md:94; external/2026-11-02/reddit.com-r-claudeai-comments-1x1a6ym-claude-code-compacts-automatical-20261102T070932Z.md:120; external/2026-11-02/reddit.com-r-claudeai-comments-1x1a6ym-claude-code-compacts-automatical-20261102T070932Z.md:37; external/2026-11-02/reddit.com-r-claudeai-comments-1x1a6ym-claude-code-compacts-automatical-20261102T070932Z.md:39 (url: <https://www.reddit.com/r/ClaudeAI/comments/1x1a6ym/claude_code_compacts_automatically_before_cache/>); external/please-use-me-often/agent-failure-dossier/judged/setting.jsonl:17; <https://github.com/anthropics/claude-code/releases/tag/v2.1.326> (release notes).

- [ ] **CTX-462** Commenters report that hitting the 5-hour limit mid-task, or switching accounts mid-task, causes a cache miss that wastes weekly limit. On Max 5x each redo costs about 3 to 5 percent of the 5-hour window and 1 to 2 percent of the week, over 10 percent of the week when repeated; with many agents it also pays 200k to 999k of fresh input, a cache write and agent re-orientation. One user reports that 4 percent of the 5-hour window was usually about 1 percent of the weekly limit.
  Acceptance: The figures hold as commenters report them. Verification: probe.
  Basis: reported, commenters. Status: unchecked: a fact about Claude Code or the machine, with no baseline code to check.
  Source: external/2026-10-31/reddit.com-r-claudeai-comments-1xjlvlc-anthropic-renames-max5-and-max20-20261030T212506Z.md:112; external/2026-10-31/reddit.com-r-claudeai-comments-1xjlvlc-anthropic-renames-max5-and-max20-20261030T212506Z.md:423; external/2026-10-31/reddit.com-r-claudeai-comments-1xjlvlc-anthropic-renames-max5-and-max20-20261030T212506Z.md:467; external/2026-10-31/reddit.com-r-claudeai-comments-1xjlvlc-anthropic-renames-max5-and-max20-20261030T212506Z.md:469 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xjlvlc/anthropic_renames_max5_and_max20_and_removes_5h/>).

## Compaction and Context Thresholds

- [ ] **CTX-463** /export writes what was reported on the terminal during the session, not the loaded context or thinking tokens. One commenter never compacts: a tool clones and truncates messages or starts a new session with parent-session back pointers, plus a fast full-text search over past session files so agents or humans can search prior work.
  Acceptance: The facts hold as commenters report them. Verification: probe.
  Basis: reported, commenters. Status: unchecked: a fact about Claude Code or the machine, with no baseline code to check.
  Source: external/2026-11-02/reddit.com-r-claudeai-comments-1pwt86e-pro-tip-disable-compacting-use-y-20261102T071016Z.md:133; external/2026-11-02/reddit.com-r-claudeai-comments-1pwt86e-pro-tip-disable-compacting-use-y-20261102T071016Z.md:335; external/2026-11-02/reddit.com-r-claudeai-comments-1pwt86e-pro-tip-disable-compacting-use-y-20261102T071016Z.md:339 (url: <https://www.reddit.com/r/ClaudeAI/comments/1pwt86e/pro_tip_disable_compacting_use_your_own/>).

## Compaction and Context Thresholds

- [ ] **CTX-464** One author reports that in the last 30 days 78 of 82 auto-compactions landed mid-task, and that Claude re-reads files afterwards to work out where it was. In a replay of long sessions Claude re-read about 30 percent less context once it picked its own moment to compact; the author says the replay side flatters this tool a bit, since it includes the handoff steps, which is why the figure is about 30 percent and not 33.
  Acceptance: The figures hold as one author reports them; the saving is a replay, not a controlled run. Verification: probe.
  Basis: reported, one user. Status: unchecked: a fact about Claude Code or the machine, with no baseline code to check.
  Source: external/2026-11-02_p2/reddit.com-r-claudeai-comments-1x95lff-about-30-less-context-reread-cla-20261102T084459Z.md:29, <https://www.reddit.com/r/ClaudeAI/comments/1x95lff/about_30_less_context_reread_claude_finishes_the/>; external/2026-11-02_p2/reddit.com-r-claudeai-comments-1x95lff-about-30-less-context-reread-cla-20261102T084459Z.md:115, <https://www.reddit.com/r/ClaudeAI/comments/1x95lff/about_30_less_context_reread_claude_finishes_the/>.

## Compaction and Context Thresholds

- [ ] **CTX-465** claudetto shall rely on these cache facts: Main session TTL 1 h on subscription, 5 min for subagents (cited docs); a subagent idle 31 min read 50,876 tokens from cache, wrote 1,054 (measured one user); `subagentPromptCacheTtl` needs 2.1.242+ (2.1.327: present, binary string search); `promptCacheTtl` (present in 2.1.327); `/usage` "Prompt cache (main)" line present in 2.1.327 (chunk-m14bt1pz.js@1251209; the v2.1.251 start is not checkable locally because only 2.1.327 is installed); issue anthropics/claude-code #101685 claims 5 min again (unverified); thinking keeps cache warm (reported); Claude Code no longer uses Haiku for compaction, uses session model unless configured (fake-API probe, 2026-11-18: with `--model claude-sonnet-5-5`, `/compact` sent its summary request to claude-sonnet-5-5; a compaction-model setting was not found by search for `compactModel`); idle compaction first in 2.1.290, 2.1.299 release notes (reported); desktop "Code" tab has no TTL worry (unverified); preserve-thinking invalidates earlier thinking blocks on any prefix change (reported); weekly limit ~9 five-hour windows Pro/Max 5x, ~4.5 Max 20x (arithmetic unverified); effort change mid-session on Opus 5.5 no longer invalidates cache (single commenter; conflict with "effort change mostly separate cache"). Changelog-based theory (as posted): v2.1.232 subagent forking default, background spawns; v2.1.257 advisor sessions missed cache on compaction/`/recap`/suggestions; v2.1.260 (Fable 5.1) context after tool results uncached each turn. Measured (own transcripts, 6 months): 56% of spend context re-read, 20% useful, ~half of calls >200k; slide compaction benchmark (Haiku 5.5, third party) and window tuning before/after (reported). Env: `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` present, `CLAUDE_CODE_AUTO_COMPACT_WINDOW` present, `CLAUDE_CODE_MAX_OUTPUT_TOKENS` present (chunk-2ew0jg68.js:45562), `MAX_THINKING_TOKENS` and `MAX_MCP_OUTPUT_TOKENS` present (2.1.327 binary string search), `CLAUDE_CODE_IDLE_COMPACT_MIN_TOKEN` absent in 2.1.327 (the real name is `..._TOKENS`; matches of the singular form are all the plural), setting `idleCompaction` present in 2.1.327, `/autocompact 500000` works as a command (fake-API probe, 2026-11-18: "Auto-compact window for Opus 5.5 set to 500k tokens"; the setting minimum is 100000, chunk-ja5z738t.js@279780; flag `--autocompact` present in 2.1.327).
  Acceptance: Reported lines are re-queried on 2.1.327 before use. Verification: probe.
  Basis: reported. Status: unchecked: a fact about Claude Code, not code at 088a227c.
  Conflict: Cache: turn 1 had a 49.6% hit.
  Conflict: Prompt cache mechanics: the prefix cache is keyed on model.
  Source: external/2026-10-07_p2/export-Subagents use a 5-min cache by default-!- 🤦🏻_♂️.jsonl:27; external/2026-10-07_p2/export-Subagents use a 5-min cache by default-!- 🤦🏻_♂️.jsonl:2 (url: <https://www.reddit.com/r/ClaudeCode/comments/1wz1qd4/subagents_use_a_5min_cache_by_default/>); openspec/changes/2-1-325-rearchitecture/design.md:102.

## Compaction and Context Thresholds

- [ ] **CTX-466** On 2.1.325 with haiku-5-5, `$.session.usage({breakdown}).autoCompactThreshold` reports 967,000 while real compaction runs at 490,000 (`thresholdSource=model-default`), so no context notice can precede compaction (measured on 2.1.325). On 2.1.327 with `claude-haiku-5-5`, no settings and the fake API, `/context` reports a 1m window and a 33k autocompact buffer, so the default threshold is 967,000 and the 490,000 figure is not reproduced. A smaller window can come from `clientdata` or `experiment` sources, which are server-supplied (the `autocompact_state` schema lists `env`, `settings`, `clientdata`, `experiment`, `model-default`, `unknown-model`, `auto`; chunk-rj3e7agr.js@617843), so the 490,000 case is kept as observed on 2.1.325 and cannot be re-created with a fake API. `CLAUDE_CODE_AUTO_COMPACT_WINDOW=40000` is raised to Claude Code's 100k minimum (effective 80k); `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` is a percent of the window less the 20,000 output reserve. CLAUDE_AUTOCOMPACT_PCT_OVERRIDE is a percent of the window less the 20,000 output reserve (L4, Ure in chunk-24jdhyyr.js, claude 2.1.319 binary; the module is gone from 2.1.327). Verified on 2.1.327: the effective window is the model window minus `min(maxOutputTokens, 20000)` (chunk-m14bt1pz.js@1998790) and the threshold is `min(floor(effective*pct/100), effective-13000)` for a pct above 0 and up to 100 (chunk-m14bt1pz.js@1992285), so 29.44 on a 200k window with 20k or more output tokens gives floor(180000*0.2944)=52,992, near 53,000.
  Conflict: dedup/chunks/ctx-2.md:487 says auto-compact fires at the window minus 13,000 (967,000 on the 980,000 haiku-5-5 window), with compact_boundary records at 967k-983k in; this item says real compaction runs at 490,000. Probe 2026-11-17 (2.1.326, cc-inspect `cli` `/context`, model claude-haiku-5-5, API key, no settings): window 1m, autocompact buffer 33k, so the default threshold is 967,000; 490,000 needs a smaller resolved window, whose source (env, settings, client data, experiment, model default) the 2.1.325 run did not record (`resolveAutoCompactWindow` sources, chunk-rj3e7agr.js@618658 (2.1.327)).
  Basis: measured (2.1.325 run, kept as observed; its window source was not recorded); measured on 2.1.327 (cc-inspect cli, `--model claude-haiku-5-5`, prompt `/context`, fake API, 2026-11-18: window 1m, buffer 33k, default threshold 967,000); read from source (2.1.319 binary; 2.1.327 chunk-rj3e7agr.js@617843).
  Source: probe cc-inspect cli 2.1.327, 2026-11-18, `/context` with `--model claude-haiku-5-5`; openspec/specs/compaction-path/spec.md:15; openspec/changes/2-1-325-rearchitecture/design.md:61; openspec/changes/archive/2026-11-10-release-2-1-319-1/design.md:160.

- [ ] **CTX-467** Env keys new in 2.1.296 and present on 2.1.326 (binary string search, every name found): agent-level `autoCompactWindow` (setting present; agent frontmatter verified: the agent schema carries `autoCompactWindow`, "only lowers the window the subagent would otherwise inherit", chunk-rj3e7agr.js@297758, 2.1.327), `CLAUDE_CODE_SLEEP_COMPACT_AFTER_MS` (also `CLAUDE_CODE_SLEEP_COMPACT`), `CLAUDE_CODE_WORKFLOW_SUBAGENT_MODEL`, `CLAUDE_CODE_AGENT_PROGRESS_SUMMARIES`, `CLAUDE_CODE_RESUME_SESSIONSTART_HOOKS_WAIT_MS`. Also present: `CLAUDE_CODE_STOP_HOOK_BLOCK_CAP`, `CLAUDE_CODE_SUBAGENT_MODEL`, `CLAUDE_CODE_PROMPT_CACHE_TTL`, `maxEffortLevel`, `switchModelsOnFlag`, `fileCheckpointingEnabled`, `autoContinueAtUsageLimit`; `per_turn_effort_active` is `true` in the 2.1.327 stream-json init event (fake-API probe, 2026-11-18; schema chunk-rj3e7agr.js@483149). Also on 2.1.326: `CLAUDE_CODE_TOTAL_TOKENS_REMINDER_BUDGET` (padded countdown, 15,000,000 on a 1M window), `CLAUDE_CODE_AUTO_COMPACT_WINDOW`, `CLAUDE_CODE_IDLE_COMPACT_MIN_TOKENS`, `precomputeCompactionEnabled`. `CLAUDE_CODE_WORKFLOW_SUBAGENT_MODEL` and sleep-compaction tuning are new in 2.1.296; `per_turn_effort_active` keeps the cache across effort changes and answers the Codex effort-switch cache-bust issue. claudetto shall treat `autoCompactWindow` (setting) and `CLAUDE_CODE_AUTO_COMPACT_WINDOW` (env) as present in 2.1.326 (binary string search: `autoCompactWindow` 73 hits, `CLAUDE_CODE_AUTO_COMPACT_WINDOW` 16 hits).
  Acceptance: Kept beside the plan's WORKFLOW_SUBAGENT_MODEL line. Verification: inspection. The old specs (setup/spec.md:267, :272; tier-profiles/spec.md:32) describe `autoCompactWindow` while CHANGELOG.md:171 says setup no longer writes `autoCompactWindow: 300000`; the setting itself still exists, and setup writes `autoCompactWindow: 100_000` under the Haiku model settings. CHANGELOG.md:158 also says the setting was removed (read). Recheck before deleting the spec text. Verification: probe.
  Basis: measured (string search of the 2.1.326 binary; `per_turn_effort_active` is verified on 2.1.327 as an init field and `per_turn_effort_changed` as a system subtype, chunk-rj3e7agr.js@483149 and @608893; the padded countdown value was not re-read). strings (from the Claude Code binary), not re-run. read. Status: partial at 088a227c (settings.ts:114 writes it for Haiku only).
  Status: n/a (fact).
  Source: external/please-use-me-often/agent-failure-dossier/05-appendices-and-limitations.md:43 and external/please-use-me-often/agent-failure-dossier/judged/setting.jsonl:104 name `CLAUDE_CODE_SLEEP_COMPACT_AFTER_MS` and `CLAUDE_CODE_WORKFLOW_SUBAGENT_MODEL` for 2.1.296; `CLAUDE_CODE_WORKFLOW_SUBAGENT_MODEL` is also in `surface` env on 2.1.327 (chunk-2ew0jg68.js@44311). Related: external/please-use-me-often/agent-failure-dossier/04-engineering-delegation-and-cost.md:176,178; openspec/specs/setup/spec.md:267@088a227c9^ (Haiku 5.5 `autoCompactWindow` 100000; the earlier cited design.md:163, a conflicts list, does not support PreModelSwitch and was removed); openspec/specs/tier-profiles/spec.md:32; CHANGELOG.md:171@088a227c; plugins/claudetto/hooks/features/setup/settings.ts:114@088a227c.

- [ ] **CTX-468** Vendor sources and machine facts: the Anthropic page `about-claude/models/optimizing-for-cost-and-intelligence` is the first vendor source for the 90,000 Haiku trigger and for $0.50 against $0.10 per MTok at 100,000 (cited). Mole 1.68.0 `mo purge` defaults miss `~/CodeProjects`; a purge-paths file replaces discovery; `mo clean --dry-run` previewed about 9 GB. Dossier defects D1-D10.38 (headings only read) include path spam, a hygiene sweep deleting live probe folders, worktree creation rewriting a shared hooks path, and rule reminders moving the cache breakpoint (reported).
  Basis: cited / reported.
  Source: openspec/specs/compaction-path/spec.md:70; openspec/specs/setup/spec.md:115; the "about 9 GB" and D1-D10.38 wording: unresolved.

## Compaction and Context Thresholds

- [ ] **CTX-469** 524 `thinking_drop` `prefix_mismatch` rows: 515 fall within 10 minutes after a `compact_boundary` and 510 report `firstChangedMessageIndex` 0, so compaction causes them, not a plugin hook.
  Basis: measured.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/defects.md:644.

- [ ] **CTX-470** Cache rebuilds (82 in 5 days, 5.73M cache-write tokens) follow a `nested_memory` row in 73 of 82 (89%, against 0.8% of non-rebuild requests). One rule load alone did not rebuild (billed Haiku probe, 0.0065 USD). The cause is lookback: the API checks at most 20 positions back from the single moving message breakpoint; each system-reminder text block counts one position and a run of `tool_use` or `tool_result` counts one. By positions: 21 steps or fewer 46,612 with 22 rebuilds (0.05%); 22-25 88 with 56 (63.6%); over 25 44 with 43 (97.7%). One first read loading 22 path-scoped rules (5 user, 17 project) wrote 41,147 tokens.
  Basis: measured, with the lookback rule cited.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/defects.md:693; openspec/changes/archive/2026-11-16-2-1-323/research/defects.md:707; openspec/changes/archive/2026-11-16-2-1-323/research/defects.md:713.

- [ ] **CTX-471** Archive-wide cache rebuild rates by step size: 1-4 calls rebuilt 0.2% within a minute, 5.9% at 1-5 min, 95% past an hour (TTL); 5-8 calls 1.6% and 28.2%; 9+ calls 2.2% and 18.2%. Rebuilds wrote 17.2M of 151.5M cache-write tokens. Compaction (keep 0) preceded 172 rebuilds in 1,410 steps (12.2%). No-change steps rebuilt 119 of 46,936 (0.25%). A model change rebuilt 9 of 9. The main loop ran 4,634 requests on Mythos (425M tokens). Base: 841 transcripts, 2026-11-08 to 11-13.
  Basis: measured.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/defects.md:774; openspec/changes/archive/2026-11-16-2-1-323/research/defects.md:777.

- [ ] **CTX-472** `autoCompactWindow` 100000 on a plugin agent: stub usage 150,000 gave "fixed prefix ~147466 > threshold 40000 -- compaction cannot help" and a reactive compact that bailed once. With usage 1,000 nothing compacted and the request body grew to 169 KB. Compaction follows reported usage, not request size.
  Basis: measured.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/probes.md:140; openspec/changes/archive/2026-11-16-2-1-323/research/probes.md:141.

- [ ] **CTX-473** One user's weekly limit ran out in 5 days at 3.20B tokens, 96.8% cache reads, main sessions 57%.
  Basis: reported, one user.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/issues-2026-11-09.md:77.

- [ ] **CTX-474** Compaction took 62-80 s, 7 times in 2 h. The cause was large tool outputs; the claudetto part took under 1 s.
  Basis: reported (one issue row with no quote); not reproduced on 2.1.327 (paid run, Sonnet 5.5, `/compact` in a stream-json session, `compact_metadata.duration_ms`, reports/2026-11-18-research/paid-labs/README.md). With three 80 KB file reads in context (about 122k tokens before compaction, 3.2k after), compaction took 9.3-10.5 s in 3 runs. With one 2 KB read (about 17k tokens) it took 7.5-8.1 s in 3 runs. Large tool outputs add about 2 s here, not 60 s. The reported 62-80 s came from another model, version or server load, and the row does not say which.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/issues-2026-11-09.md:24.

- [ ] **CTX-475** API compaction on Haiku: one session cost $0.272 at a 150k trigger, $0.082 at 90k, $0.075 at 50k, $0.729 with none.
  Basis: cited.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/model-effort.md:38.

- [ ] **CTX-476** Subagent start costs 5k-11k tokens. Cache TTL expiry makes weak-model subagents cost the root more. No `subagentPromptCacheTtl` hit exists under hooks.
  Basis: reported (observed in the source log).
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/issues-2026-11-09.md:70.

- [ ] **CTX-477** `subagentPromptCacheTtl` "1h" raised total cost for subagents and lowered it for the orchestrator (one user). A second user reports the opposite: subagents that worked one lane for 30-60 minutes used about 500k tokens each at the 5-minute TTL and about 100k after the switch to 1 hour; a third notes that a subagent running a test suite outlasts 5 minutes. The two reports agree with CTX-294: the 1-hour write pays only when a subagent re-reads its prefix after more than 5 minutes idle, so the choice follows subagent lifetime and idle gaps, not a fixed rule.
  Basis: reported, one user each, opposite results; resolved by the CTX-294 break-even, not by either report.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/reddit-1.md:28 (url: <https://www.reddit.com/r/ClaudeCode/comments/1wz1qd4/subagents_use_a_5min_cache_by_default/>.); external/2026-10-17/export---usage- has suddenly skyrocketed this week.jsonl:84; external/2026-10-17/export---usage- has suddenly skyrocketed this week.jsonl:88; external/2026-10-17/export---usage- has suddenly skyrocketed this week.jsonl:92.

## Compaction and Context Thresholds

- [ ] **CTX-478** Claude Code 2.1.325 has env vars `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`, `CLAUDE_CODE_AUTO_COMPACT_WINDOW` (accepts `k` and `M`), `CLAUDE_CODE_IDLE_COMPACT_MIN_TOKENS`, `CLAUDE_CODE_SLEEP_COMPACT` (a timer at 0.9 of the cache TTL), `CLAUDE_CODE_SLEEP_COMPACT_AFTER_MS` (clamped to 60000-210000), `CLAUDE_CODE_COLD_COMPACT`, `CLAUDE_CODE_DISABLE_PRECOMPACT_SKIP`, `CLAUDE_AFTER_LAST_COMPACT`, `DISABLE_AUTO_COMPACT`, `DISABLE_COMPACT`; settings `autoCompactEnabled`, `autoCompactWindow`, `idleCompaction` (default true), `precomputeCompactionEnabled`.
  Acceptance: cc-inspect `surface` lists them. Verification: probe.
  Basis: measured. Status: have.
  Source: cc-inspect `surface`, `claude` 2.1.325, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:6738).

- [ ] **CTX-830** On 2.1.327 the compaction call sends the same tools and system as the main loop, so it reads the cached prefix, with `max_tokens` 128000, adaptive thinking and effort medium; only the summary and the new tail are written afresh.
  Acceptance: the request captured after `/compact` in a fake-API run carries the main loop's tools and system and a cache read of the prefix. Verification: probe.
  Basis: probed (cc-inspect `code run` with prompts `["first one","/compact"]`, request 2, claude 2.1.327, 2026-11-18); read (chunk-m14bt1pz.js@2958807). Status: unchecked at 088a227c.
  Source: reports/2026-11-18-research/handover.md:27-29 (Q3).

- [ ] **CTX-843** In the interactive TUI of 2.1.327, `$.session.compact({instructions})` called from a `turn.complete` hook is accepted (it is rejected only under `-p`, RT-025). The `session.compact` hook then receives the keys `trigger`, `instructions` and `messages`, with trigger `plugin` and no `agentId`. Core accepts only the return shape `{messages:[{role:"user", text, toolUses:[]}]}`; a message with `content` in place of `text`, or one without `toolUses`, is logged as "session.compact hook skipped: returned the wrong shape" and the default summary runs instead. A hook that returns an accepted shape makes no summarizer request: run 3 sent two `/v1/messages` requests in total, while the two wrong-shape runs sent four. The next user prompt is merged into the handover user turn as a second text block.
  Acceptance: the probe-h logs show the hook keys, the skip message for each wrong shape, the request counts, and the merged first message. Verification: probe.
  Basis: probed (interactive TUI in tmux against a local fake API, plugin under `--plugin-dir`, three runs, claude 2.1.327, 2026-11-18). Status: unchecked at 088a227c.
  Source: reports/2026-11-18-research/handover-probes/probe-h/probe.log; probe-h/run1..3/hook.log and stub.trimmed.log; probe-h/plugin/hooks/register.js.

- [ ] **CTX-844** `/rewind` to an earlier prompt keeps the cached prefix: the next request carried the same tools (34,072 B) and system (6,409 B) and byte-identical earlier messages, with the same `cache_control` placement. Rewind puts the rewound prompt back in the input box, so text typed straight after it is appended to that prompt.
  Acceptance: probe-h/rewind.log shows the byte comparison and the merged prompt. Verification: probe.
  Basis: probed (interactive TUI in tmux against a local fake API, claude 2.1.327, 2026-11-18). Status: n/a (core behaviour).
  Source: reports/2026-11-18-research/handover-probes/probe-h/rewind.log and probe-h/probe.log.

## External Sweep, 2026-11-18

- [ ] **CTX-857** Reports of degradation after repeated compaction: one user's logs show thinking tokens falling after each compaction and not without it; another finds Opus loses orchestration state and forgets its skills after two or three compactions. This supports renewal at a task boundary before compaction stacks up (ADR-0178) over chained compactions.
  Basis: reported, two users, no numbers shown.
  Source: external/2026-11-14/reddit.com-r-claudecode-comments-1xul65u-opus-55-is-still-the-better-da-20261114T021719Z.md:230; external/2026-11-16/reddit.com-r-claudecode-comments-1xwgcbm-i-worry-that-anthropic-does-no-20261115T134431Z.md:322.

- [ ] **CTX-858** Keeping every user message that sets or changes something word for word through compaction raised one author's "what changed" test from 9 or 10 of 12 to 12 of 12 on the same model. The handover file and the PreCompact instructions (ADR-0075) carry user-set decisions verbatim, not paraphrased.
  Basis: measured (third-party, numbers shown, one author).
  Source: external/2026-11-04/reddit.com-r-claudeai-comments-1xmzcut-how-did-you-get-better-at-buildi-20261104T085832Z.md:64.

- [ ] **CTX-859** One commenter's context-publisher mod hands work off when a subagent runs longer than 20 minutes or fills 30% of its context, and the main agent hands off when its own context grows; the commenter says the status-line context percentage was miscounted and measured context from a PostToolUse hook instead. claudetto's renewal threshold (ADR-0069, ADR-0178) reads a context figure, so the figure is checked once against request `usage` before a threshold is tuned on it.
  Basis: reported (third-party); the miscount is unverified.
  Source: external/2026-10-12/export-Now that mods are here, what are your favorites-.jsonl:15.

- [ ] **CTX-886** One author measuring long unattended sessions found half of all tokens came from turns where the context was already past 200k; autocompact at 200k gave little control over what was handed over. Supports renewal at a task boundary above 70k (ADR-0178) over waiting for autocompact. A third-party post quotes Anthropic help text for the Claude apps: longer conversations that trigger automatic context management use more of the usage limit, and a new conversation is advised near the limit; the help-center page is not among the doc sources read this session, so the quote stays reported.
  Basis: measured (third-party, one author, no raw data); quote reported.
  Source: external/2026-10-03/export-handoff-compact, a mod that does the handoff + -clear routine for you every time autocompact fires.jsonl:2; external/2026-11-18_p2/reddit.com-r-anthropic-comments-1xzigir-that-organizing-its-thoughts-pa-20261118T182414Z.md:31.
