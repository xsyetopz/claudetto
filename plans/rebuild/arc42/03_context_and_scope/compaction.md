# compaction

## Compaction And Context Thresholds

- [ ] **CTX-443** Reported by a commenter (poster on 2.1.241 lacked the field): PreCompact can block compaction (exit 2 or {"decision":"block"}); a proactive auto compact is then skipped, but if the API already returned the context-limit error, blocking makes the request fail. A trigger auto/manual field exists since 2.1.290, so one can block auto and run a manual /compact with "keep every decision and rejected option verbatim". Checked in claude 2.1.326 with cc-inspect `code` search for `compact_summary`: the PreCompact hook input carries `trigger` "manual" or "auto" (chunk-bprgtdg6.js@278627). The blocking behavior, exit 2, and `{"decision":"block"}` claims are unverified in 2.1.326.
  Basis: reported; the trigger field measured in the 2.1.326 binary, the rest unverified.
  Source: external/2026-10-22/reddit.com-r-claudecode-comments-1xbfly6-60-compactions-into-one-claude-20261022T003216Z.md:237 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xbfly6/60_compactions_into_one_claude_code_session_the/>); claude 2.1.326 binary chunk-bprgtdg6.js@278627.

## Compaction And Context Thresholds

- [ ] **CTX-444** Reported: PreCompact is a shell command whose output never reaches Claude or the summary; PostCompact receives the new summary as compact_summary, so a script can check each generation against the decision log; hook output over 10,000 characters is swapped for a file path plus a 2,000-character preview that Claude is not asked to read. Checked in claude 2.1.326 with cc-inspect `code` search for `compact_summary`: the PostCompact input has `compact_summary` ("The conversation summary produced by compaction") (chunk-bprgtdg6.js@278627). The PreCompact output and the 2,000-character preview claims are unverified in 2.1.326.
  Basis: reported; the PostCompact field measured in the 2.1.326 binary, the rest unverified.
  Source: external/2026-10-22/reddit.com-r-claudecode-comments-1xbfly6-60-compactions-into-one-claude-20261022T003216Z.md:364 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xbfly6/60_compactions_into_one_claude_code_session_the/>); claude 2.1.326 binary chunk-bprgtdg6.js@278627.

## Compaction And Context Thresholds

- [ ] **CTX-445** Audit of one user's transcripts: 72% of input was Claude re-reading context past 400k tokens (method unstated).
  Basis: reported, one user, method unstated.
  Source: external/2026-10-22/reddit.com-r-claudecode-comments-1xbfly6-60-compactions-into-one-claude-20261022T003216Z.md:266 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xbfly6/60_compactions_into_one_claude_code_session_the/>).

## Compaction And Context Thresholds

- [ ] **CTX-446** Four outside sources that claim built-in compaction is expensive were read on 2026-10-28. None changed a value, because the only one with a real sample fits its band on a window near 1M against the project's 300,000, and the often-quoted figure of about $3.00 per compaction appears in no source read
  Basis: reported.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/specs/compaction-path/spec.md:27.

## Compaction And Context Thresholds

- [ ] **CTX-447** Auto-compact fires at the window minus 13,000 (warning 20,000 before, hard block at the window minus 3,000). The haiku-5-5 980,000 window gives 967,000. `compact_boundary` records show 967k-983k in, 11k-15k out, 72-237 s each
  Conflict: The merged 6:302 group (merged/004.md) measured on 2.1.325 that real compaction runs at 490,000 on haiku-5-5 while the reported threshold is 967,000; this item says auto-compact fires at 967,000 on the 980,000 window. Probe 2026-11-17 (2.1.326, cc-inspect `cli` `/context`, model claude-haiku-5-5, API key, no settings): window 1m, autocompact buffer 33k, so the default threshold is 967,000; 490,000 needs a smaller resolved window, whose source (env, settings, client data, experiment, model default) the 2.1.325 run did not record (`resolveAutoCompactWindow` sources, chunk-bprgtdg6.js@614505).
  Basis: cited.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1580.

- [ ] **CTX-448** `/autocompact [auto|tokens]` writes `modelSettings.<model>.autoCompactWindow` in user settings; "auto" clears it; 0 request text. Proposed: set it in settings so it is checked in
  Basis: cited.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1586.

## Compaction And Context Thresholds

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

## Compaction And Context Thresholds

- [ ] **CTX-456** Community reports on what survives compaction: root CLAUDE.md and unscoped rules are re-read after compaction; scoped rules, mid-session instructions, and hook output become summary paraphrase. A post found 2 of 8 compactions dropped a skill body (v2.1.285, `-p --resume` only) and compact-hook output attached in 4 of 4 tests. Bug #15174 (compact matcher output not injected) was closed (reported, anecdote).
  Basis: reported, anecdote.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/evidence/tmp/research-syc-community.md:26.

- [ ] **CTX-457** Other community reports, from search snippets only: issue #4017 claims a rule is violated "100% of the time after compaction"; Cursor staff say many loaded rules cost context, so keep each rule file under 500 lines and scope rules to files; a Cline Memory Bank re-read has token and staleness costs (reported, snippet).
  Basis: reported, snippet.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/evidence/tmp/research-syc-community.md:12-14; openspec/changes/archive/2026-11-09-release-2-1-319/evidence/tmp/research-syc-community.md:27; openspec/changes/archive/2026-11-09-release-2-1-319/evidence/tmp/research-syc-community.md:28.

## Compaction And Context Thresholds

- [ ] **CTX-458** Autocompact replaces the window with a summary of about 64k tokens: a rewrite task needed 375k tokens just to load inputs for its smallest slice, so a compaction resumed with 64k.
  Basis: reported, one user, no comparison test. Status: not applicable (outside fact).
  Source: external/2026-11-06/reddit.com-r-claudecode-comments-1xo6dfy-thanks-to-two-lines-in-the-cla-20261105T084836Z.md:281-283 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xo6dfy/thanks_to_two_lines_in_the_claude_setting_i_was/>).

- [ ] **CTX-459** One user's own monitoring found 130k tokens the most cost-effective point to clear; the app injects a save-progress-to-disk request, then clears and continues, with auto-compact off.
  Basis: reported, one user, no figures. Status: not applicable (outside fact).
  Source: external/2026-11-06/reddit.com-r-claudecode-comments-1xo6dfy-thanks-to-two-lines-in-the-cla-20261105T084836Z.md:516 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xo6dfy/thanks_to_two_lines_in_the_claude_setting_i_was/>).

- [ ] **CTX-460** Settings rationale given for 300k and 75: below 300k summaries lose detail, above it context cost creeps; 75 leaves the agent room to write the compact, while 80-100 fumbles and below 75 compacts too often.
  Basis: reported, one user, 20 USD plan, no measures. Status: not applicable (outside fact).
  Source: external/2026-11-06/reddit.com-r-claudecode-comments-1xo6dfy-thanks-to-two-lines-in-the-cla-20261105T084836Z.md:53-54 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xo6dfy/thanks_to_two_lines_in_the_claude_setting_i_was/>).

## Compaction And Context Thresholds

- [ ] **CTX-461** One commenter, citing a GitHub issue (98747), reports idle compaction, in since 2.1.290 and undocumented at the time: it fires at 90 percent of the cache TTL and only when the cache lifetime is 1 hour; the minimum-token floor (env CLAUDE_CODE_IDLE_COMPACT_MIN_TOKEN) defaults to 200k and the server may lower it to 100k, presumably at peak hours, with no word on whether a user value can be overridden the same way. idleCompaction false turns it off, but the cache still expires and the next message rewrites the whole context. autoCompactEnabled false also turns it off but also stops threshold auto-compaction. Compaction uses the session model unless configured otherwise, not Haiku, per issue 29550. The same commenters report the message "Compacted while idle, before the prompt cache expired"; one post doubted it could be turned off, which the `idleCompaction` setting refutes. `/autocompact <n>` values named are 250k, 272k, 400k and 450k ("will double your usage", unverified); a claim that Anthropic docs name 250k is unsourced.
  Acceptance: The facts hold as commenters report them. Checked on claude 2.1.326 by binary string search: setting `idleCompaction`, `autoCompactWindow`, `/autocompact`, flag `--autocompact` and `CLAUDE_CODE_AUTO_COMPACT_WINDOW` are present, and only the plural `CLAUDE_CODE_IDLE_COMPACT_MIN_TOKENS` exists; the release notes name idle compaction; the timing, the token floor and the 1-hour TTL gate are unverified in 2.1.326. Verification: probe.
  Basis: reported, commenters; cited (issues, secondhand); the presence of the settings is read from the 2.1.326 binary. Status: unchecked: a fact about Claude Code or the machine, with no baseline code to check.
  Source: external/2026-11-02/reddit.com-r-claudeai-comments-1x1a6ym-claude-code-compacts-automatical-20261102T070932Z.md:72; external/2026-11-02/reddit.com-r-claudeai-comments-1x1a6ym-claude-code-compacts-automatical-20261102T070932Z.md:74; external/2026-11-02/reddit.com-r-claudeai-comments-1x1a6ym-claude-code-compacts-automatical-20261102T070932Z.md:92; external/2026-11-02/reddit.com-r-claudeai-comments-1x1a6ym-claude-code-compacts-automatical-20261102T070932Z.md:94; external/2026-11-02/reddit.com-r-claudeai-comments-1x1a6ym-claude-code-compacts-automatical-20261102T070932Z.md:120; external/2026-11-02/reddit.com-r-claudeai-comments-1x1a6ym-claude-code-compacts-automatical-20261102T070932Z.md:37; external/2026-11-02/reddit.com-r-claudeai-comments-1x1a6ym-claude-code-compacts-automatical-20261102T070932Z.md:39 (url: <https://www.reddit.com/r/ClaudeAI/comments/1x1a6ym/claude_code_compacts_automatically_before_cache/>); external/please-use-me-often/agent-failure-dossier/judged/setting.jsonl:17; <https://github.com/anthropics/claude-code/releases/tag/v2.1.326> (release notes).

- [ ] **CTX-462** Commenters report that hitting the 5-hour limit mid-task, or switching accounts mid-task, causes a cache miss that wastes weekly limit. On Max 5x each redo costs about 3 to 5 percent of the 5-hour window and 1 to 2 percent of the week, over 10 percent of the week when repeated; with many agents it also pays 200k to 999k of fresh input, a cache write and agent re-orientation. One user reports that 4 percent of the 5-hour window was usually about 1 percent of the weekly limit.
  Acceptance: The figures hold as commenters report them. Verification: probe.
  Basis: reported, commenters. Status: unchecked: a fact about Claude Code or the machine, with no baseline code to check.
  Source: external/2026-10-31/reddit.com-r-claudeai-comments-1xjlvlc-anthropic-renames-max5-and-max20-20261030T212506Z.md:112; external/2026-10-31/reddit.com-r-claudeai-comments-1xjlvlc-anthropic-renames-max5-and-max20-20261030T212506Z.md:423; external/2026-10-31/reddit.com-r-claudeai-comments-1xjlvlc-anthropic-renames-max5-and-max20-20261030T212506Z.md:467; external/2026-10-31/reddit.com-r-claudeai-comments-1xjlvlc-anthropic-renames-max5-and-max20-20261030T212506Z.md:469 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xjlvlc/anthropic_renames_max5_and_max20_and_removes_5h/>).

## Compaction And Context Thresholds

- [ ] **CTX-463** /export writes what was reported on the terminal during the session, not the loaded context or thinking tokens. One commenter never compacts: a tool clones and truncates messages or starts a new session with parent-session back pointers, plus a fast full-text search over past session files so agents or humans can search prior work.
  Acceptance: The facts hold as commenters report them. Verification: probe.
  Basis: reported, commenters. Status: unchecked: a fact about Claude Code or the machine, with no baseline code to check.
  Source: external/2026-11-02/reddit.com-r-claudeai-comments-1pwt86e-pro-tip-disable-compacting-use-y-20261102T071016Z.md:133; external/2026-11-02/reddit.com-r-claudeai-comments-1pwt86e-pro-tip-disable-compacting-use-y-20261102T071016Z.md:335; external/2026-11-02/reddit.com-r-claudeai-comments-1pwt86e-pro-tip-disable-compacting-use-y-20261102T071016Z.md:339 (url: <https://www.reddit.com/r/ClaudeAI/comments/1pwt86e/pro_tip_disable_compacting_use_your_own/>).

## Compaction And Context Thresholds

- [ ] **CTX-464** One author reports that in the last 30 days 78 of 82 auto-compactions landed mid-task, and that Claude re-reads files afterwards to work out where it was. In a replay of long sessions Claude re-read about 30 percent less context once it picked its own moment to compact; the author says the replay side flatters this tool a bit, since it includes the handoff steps, which is why the figure is about 30 percent and not 33.
  Acceptance: The figures hold as one author reports them; the saving is a replay, not a controlled run. Verification: probe.
  Basis: reported, one user. Status: unchecked: a fact about Claude Code or the machine, with no baseline code to check.
  Source: external/2026-11-02_p2/reddit.com-r-claudeai-comments-1x95lff-about-30-less-context-reread-cla-20261102T084459Z.md:29, <https://www.reddit.com/r/ClaudeAI/comments/1x95lff/about_30_less_context_reread_claude_finishes_the/>; external/2026-11-02_p2/reddit.com-r-claudeai-comments-1x95lff-about-30-less-context-reread-cla-20261102T084459Z.md:115, <https://www.reddit.com/r/ClaudeAI/comments/1x95lff/about_30_less_context_reread_claude_finishes_the/>.

## Compaction And Context Thresholds

- [ ] **CTX-465** claudetto shall rely on these cache facts: Main session TTL 1 h on subscription, 5 min for subagents (cited docs); a subagent idle 31 min read 50,876 tokens from cache, wrote 1,054 (measured one user); `subagentPromptCacheTtl` needs 2.1.242+ (2.1.326: present, binary string search); `promptCacheTtl` (present in 2.1.326); `/usage` "Prompt cache (main)" line from v2.1.251 (unverified); issue anthropics/claude-code #101685 claims 5 min again (unverified); thinking keeps cache warm (reported); Claude Code no longer uses Haiku for compaction, uses session model unless configured (cited, unverified); idle compaction first in 2.1.290, 2.1.299 release notes (reported); desktop "Code" tab has no TTL worry (unverified); preserve-thinking invalidates earlier thinking blocks on any prefix change (reported); weekly limit ~9 five-hour windows Pro/Max 5x, ~4.5 Max 20x (arithmetic unverified); effort change mid-session on Opus 5.5 no longer invalidates cache (single commenter; conflict with "effort change mostly separate cache"). Changelog-based theory (as posted): v2.1.232 subagent forking default, background spawns; v2.1.257 advisor sessions missed cache on compaction/`/recap`/suggestions; v2.1.260 (Fable 5.1) context after tool results uncached each turn. Measured (own transcripts, 6 months): 56% of spend context re-read, 20% useful, ~half of calls >200k; slide compaction benchmark (Haiku 5.5, third party) and window tuning before/after (reported). Env: `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` present, `CLAUDE_CODE_AUTO_COMPACT_WINDOW` present, `CLAUDE_CODE_MAX_OUTPUT_TOKENS` present (chunk-07n5vvax.js:45398), `MAX_THINKING_TOKENS` and `MAX_MCP_OUTPUT_TOKENS` present (2.1.326 binary string search), `CLAUDE_CODE_IDLE_COMPACT_MIN_TOKEN` absent in 2.1.326 (the real name is `..._TOKENS`; matches of the singular form are all the plural), setting `idleCompaction` present in 2.1.326, `/autocompact 500000` as a command: unverified (flag `--autocompact` present in 2.1.326).
  Acceptance: Unverified lines are re-queried on 2.1.326 before use. Verification: probe.
  Basis: reported. Status: unchecked: a fact about Claude Code, not code at 088a227c.
  Conflict: Cache: turn 1 had a 49.6% hit.
  Conflict: Prompt cache mechanics: the prefix cache is keyed on model.
  Source: external/2026-10-07_p2/export-Subagents use a 5-min cache by default-!- 🤦🏻_♂️.jsonl:27; external/2026-10-07_p2/export-Subagents use a 5-min cache by default-!- 🤦🏻_♂️.jsonl:2 (url: <https://www.reddit.com/r/ClaudeCode/comments/1wz1qd4/subagents_use_a_5min_cache_by_default/>); openspec/changes/2-1-325-rearchitecture/design.md:102.

## Compaction And Context Thresholds

- [ ] **CTX-466** On 2.1.325 with haiku-5-5, `$.session.usage({breakdown}).autoCompactThreshold` reports 967,000 while real compaction runs at 490,000 (`thresholdSource=model-default`), so no context notice can precede compaction (measured on 2.1.325; not re-measured on 2.1.326). `CLAUDE_CODE_AUTO_COMPACT_WINDOW=40000` is raised to Claude Code's 100k minimum (effective 80k); `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` is a percent of the window less the 20,000 output reserve. CLAUDE_AUTOCOMPACT_PCT_OVERRIDE is a percent of the window less the 20,000 output reserve (L4, Ure in chunk-24jdhyyr.js, claude 2.1.319 binary), so 29.44 compacts near 53,000.
  Conflict: dedup/chunks/ctx-2.md:487 says auto-compact fires at the window minus 13,000 (967,000 on the 980,000 haiku-5-5 window), with compact_boundary records at 967k-983k in; this item says real compaction runs at 490,000. Probe 2026-11-17 (2.1.326, cc-inspect `cli` `/context`, model claude-haiku-5-5, API key, no settings): window 1m, autocompact buffer 33k, so the default threshold is 967,000; 490,000 needs a smaller resolved window, whose source (env, settings, client data, experiment, model default) the 2.1.325 run did not record (`resolveAutoCompactWindow` sources, chunk-bprgtdg6.js@614505).
  Basis: measured (2.1.325, not re-measured on 2.1.326); read from source (2.1.319 binary)
  Source: openspec/specs/compaction-path/spec.md:15; openspec/changes/2-1-325-rearchitecture/design.md:61; openspec/changes/archive/2026-11-10-release-2-1-319-1/design.md:160.

- [ ] **CTX-467** Env keys new in 2.1.296 and present on 2.1.326 (binary string search, every name found): agent-level `autoCompactWindow` (setting present; agent frontmatter unverified), `CLAUDE_CODE_SLEEP_COMPACT_AFTER_MS` (also `CLAUDE_CODE_SLEEP_COMPACT`), `CLAUDE_CODE_WORKFLOW_SUBAGENT_MODEL`, `CLAUDE_CODE_AGENT_PROGRESS_SUMMARIES`, `CLAUDE_CODE_RESUME_SESSIONSTART_HOOKS_WAIT_MS`. Also present: `CLAUDE_CODE_STOP_HOOK_BLOCK_CAP`, `CLAUDE_CODE_SUBAGENT_MODEL`, `CLAUDE_CODE_PROMPT_CACHE_TTL`, `maxEffortLevel`, `switchModelsOnFlag`, `fileCheckpointingEnabled`, `autoContinueAtUsageLimit`; `per_turn_effort_active` unverified. Also on 2.1.326: `CLAUDE_CODE_TOTAL_TOKENS_REMINDER_BUDGET` (padded countdown, 15,000,000 on a 1M window), `CLAUDE_CODE_AUTO_COMPACT_WINDOW`, `CLAUDE_CODE_IDLE_COMPACT_MIN_TOKENS`, `precomputeCompactionEnabled`. `CLAUDE_CODE_WORKFLOW_SUBAGENT_MODEL` and sleep-compaction tuning are new in 2.1.296; `per_turn_effort_active` keeps the cache across effort changes and answers the Codex effort-switch cache-bust issue. claudetto shall treat `autoCompactWindow` (setting) and `CLAUDE_CODE_AUTO_COMPACT_WINDOW` (env) as present in 2.1.326 (binary string search: `autoCompactWindow` 73 hits, `CLAUDE_CODE_AUTO_COMPACT_WINDOW` 16 hits).
  Acceptance: Kept beside the plan's WORKFLOW_SUBAGENT_MODEL line. Verification: inspection. The old specs (setup/spec.md:267, :272; tier-profiles/spec.md:32) describe `autoCompactWindow` while CHANGELOG.md:171 says setup no longer writes `autoCompactWindow: 300000`; the setting itself still exists, and setup writes `autoCompactWindow: 100_000` under the Haiku model settings. CHANGELOG.md:158 also says the setting was removed (read). Recheck before deleting the spec text. Verification: probe.
  Basis: measured (string search of the 2.1.326 binary; the padded countdown value and `per_turn_effort_active` are unverified in 2.1.326). strings (from the Claude Code binary), not re-run. read. Status: partial at 088a227c (settings.ts:114 writes it for Haiku only).
  Status: n/a (fact).
  Source: unresolved: names not found by grep in openspec/ or external/; the plan states a cc-inspect check on claude 2.1.325 (probe not re-run here). Related: openspec/changes/2-1-325-rearchitecture/design.md:163 (PreModelSwitch); external/please-use-me-often/agent-failure-dossier/04-engineering-delegation-and-cost.md:176,178; openspec/specs/setup/spec.md:267; openspec/specs/tier-profiles/spec.md:32; CHANGELOG.md:171@088a227c; plugins/claudetto/hooks/features/setup/settings.ts:114@088a227c.

- [ ] **CTX-468** Vendor sources and machine facts: the Anthropic page `about-claude/models/optimizing-for-cost-and-intelligence` is the first vendor source for the 90,000 Haiku trigger and for $0.50 against $0.10 per MTok at 100,000 (cited). Mole 1.68.0 `mo purge` defaults miss `~/CodeProjects`; a purge-paths file replaces discovery; `mo clean --dry-run` previewed about 9 GB. Dossier defects D1-D10.38 (headings only read) include path spam, a hygiene sweep deleting live probe folders, worktree creation rewriting a shared hooks path, and rule reminders moving the cache breakpoint (reported).
  Basis: cited / reported.
  Source: openspec/specs/compaction-path/spec.md:70; openspec/specs/setup/spec.md:115; the "about 9 GB" and D1-D10.38 wording: unresolved.

## Compaction And Context Thresholds

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
  Basis: inferred.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/issues-2026-11-09.md:24.

- [ ] **CTX-475** API compaction on Haiku: one session cost $0.272 at a 150k trigger, $0.082 at 90k, $0.075 at 50k, $0.729 with none.
  Basis: cited.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/model-effort.md:38.

- [ ] **CTX-476** Subagent start costs 5k-11k tokens. Cache TTL expiry makes weak-model subagents cost the root more. No `subagentPromptCacheTtl` hit exists under hooks.
  Basis: reported (observed in the source log).
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/issues-2026-11-09.md:70.

- [ ] **CTX-477** `subagentPromptCacheTtl` "1h" raised total cost for subagents and lowered it for the orchestrator (one user).
  Basis: reported, one user.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/reddit-1.md:28 (url: <https://www.reddit.com/r/ClaudeCode/comments/1wz1qd4/subagents_use_a_5min_cache_by_default/>.)

## Compaction And Context Thresholds

- [ ] **CTX-478** Claude Code 2.1.325 has env vars `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`, `CLAUDE_CODE_AUTO_COMPACT_WINDOW` (accepts `k` and `M`), `CLAUDE_CODE_IDLE_COMPACT_MIN_TOKENS`, `CLAUDE_CODE_SLEEP_COMPACT` (a timer at 0.9 of the cache TTL), `CLAUDE_CODE_SLEEP_COMPACT_AFTER_MS` (clamped to 60000-210000), `CLAUDE_CODE_COLD_COMPACT`, `CLAUDE_CODE_DISABLE_PRECOMPACT_SKIP`, `CLAUDE_AFTER_LAST_COMPACT`, `DISABLE_AUTO_COMPACT`, `DISABLE_COMPACT`; settings `autoCompactEnabled`, `autoCompactWindow`, `idleCompaction` (default true), `precomputeCompactionEnabled`.
  Acceptance: cc-inspect `surface` lists them. Verification: probe.
  Basis: measured. Status: have.
  Source: cc-inspect `surface`, `claude` 2.1.325, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:6738).
