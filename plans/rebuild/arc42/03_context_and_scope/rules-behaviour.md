# rules-behaviour

## Rules And Model Behaviour

- [ ] **CTX-479** The syntax @path/to/file in CLAUDE.md inlines another file (a cross-project memory index loaded from user CLAUDE.md). A commenter reports the memory store hit its limit and ejected the wrong memories.
  Basis: reported, anecdote.
  Source: external/2026-10-22/reddit.com-r-claudecode-comments-1xbfly6-60-compactions-into-one-claude-20261022T003216Z.md:231 (url: https://www.reddit.com/r/ClaudeCode/comments/1xbfly6/60_compactions_into_one_claude_code_session_the/).

## Rules And Model Behaviour

- [ ] **CTX-480** One month, about 15 agents with the rule "when corrected write one dated line to memory/lessons.md and read it each session": 247 lines (busiest agent 47, some under 5), mostly environment facts (zsh no word-split, find is bfs and rejects -newermt, no PIL use sips, tool calls die at 600s) and vague asks, not model faults; "a failed check with 2>/dev/null looked like a pass".
  Basis: reported, poster.
  Source: external/2026-10-22/reddit.com-r-claudecode-comments-1xbnwcw-a-month-of-my-claude-code-agen-20261022T044334Z.md:29 (url: https://www.reddit.com/r/ClaudeCode/comments/1xbnwcw/a_month_of_my_claude_code_agents_writing_down/).

## Rules And Model Behaviour

- [ ] **CTX-481** Per-agent lessons load about 8 KB plus about 6 KB shared (about 3.5k tokens), identical each session so cached; a 10 KB cap per agent file, past which duplicates merge and some archive. Kept loaded, not behind an index, because expensive mistakes throw no error (wrong weekday, "doc does not exist") so a pointer is never followed.
  Basis: reported.
  Source: external/2026-10-22/reddit.com-r-claudecode-comments-1xbnwcw-a-month-of-my-claude-code-agen-20261022T044334Z.md:115 (url: https://www.reddit.com/r/ClaudeCode/comments/1xbnwcw/a_month_of_my_claude_code_agents_writing_down/).

## Rules And Model Behaviour

- [ ] **CTX-482** Source read of other harnesses: Aider rebuilds a system_reminder every request, last in the list, only if tokens < max_input_tokens. Codex compaction keeps recent user messages verbatim, newest first, up to 20,000 tokens and re-injects canonical context. SWE-agent never trims the first observation. OpenHands never condenses `keep_first` events (default 2) and has an off-by-default critic loop (threshold 0.6, 3 iterations). None of the five has an agreement gate. Structure beats reminding (source read, no published rates).
  Basis: source read, no published rates.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/evidence/tmp/research-syc-community.md:102-107; openspec/changes/archive/2026-11-09-release-2-1-319/evidence/tmp/research-syc-community.md:111-115.

## Rules And Model Behaviour

- [ ] **CTX-483** Claude Code 2.1.323 hook types, read without a probe: `prompt.submit` returns `context` blocks for per-turn reminders; `session.compact` `instructions` plus `classic.SessionStart` with source `compact` carry a rule through compaction; `classic.Stop` blocks while `turn.complete` cannot; `tool.check` enforces commit and scope bans; the `session.compact` `messages` field lets a plugin keep a message whole by its handle (types read, no probe).
  Basis: inferred, types read, no probe.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/evidence/tmp/research-syc-community.md:47-55.

## Rules And Model Behaviour

- [ ] **CTX-484** A post on a lintable prompt language (llmmd) defines a PREVENT ladder. Rung 1 asks for a lint rule of the file that shows the error. Rung 2 writes one EARS sentence into `.claude/rules/<topic>.md` with a `paths` list of the files where the error happens. Rung 3 adds one CHECK line for REVIEW (reported, by the post's author).
  Basis: reported, post author.
  Source: external/2026-10-12/A_Lintable_Language_Is_All_You_Need.md:75-87.

- [ ] **CTX-485** In the same post, REVIEW appends `./reports/<task>/audit.md` with [OK], [N/A], and [NOT OK] entries and a Proposal line (reported, by the post's author).
  Basis: reported, post author.
  Source: external/2026-10-12/A_Lintable_Language_Is_All_You_Need.md:123-141.

- [ ] **CTX-486** In the same post, the CHECK list covers LICM, binding-time analysis, specialization validity, cache invalidation, SRP, DRY, contract conformance, and others (reported, by the post's author).
  Basis: reported, post author.
  Source: external/2026-10-12/A_Lintable_Language_Is_All_You_Need.md:142-158.

- [ ] **CTX-487** The post claims an analyzer can detect jumps to missing labels, unreachable steps, and loops without a stopping condition. No measurement is given (reported, unmeasured).
  Basis: reported, unmeasured.
  Source: external/2026-10-12/A_Lintable_Language_Is_All_You_Need.md:180.

## Rules And Model Behaviour

- [ ] **CTX-488** `PIN_EXTRACT` arms on 130 samples: long text 120/130 at 1,732 static characters, plain 101/130 at 1,135, credit 130/130 at 1,211, C2 (closed label list, no credit wording) at 1,207. On a blind set of 120: old 116 and 118; A 115 and 112; B 118 and 119; C 111 and 111. Credit wording adds nothing measurable once the closed label list exists (measured).
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:345; openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:346.

- [ ] **CTX-489** One example line in the task text moved "still fails" reports to `task`: 28/40 and 24/40 became 40/40 and 38/40, with every dispute kept. Earlier sets scored 496/500 against 499/500 for the current text (measured).
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:363.

## Rules And Model Behaviour

- [ ] **CTX-490** Violations ran about 0.6% for rules a hook enforced against about 5.6% for rules that were text only; keep prose for what cannot be checked mechanically.
  Basis: reported, measured by one team (own data).
  Source: external/2026-11-10/reddit.com-r-claudecode-comments-1xrx9yj-what-rules-keep-your-agent-hon-20261110T100144Z.md:81 (url: https://www.reddit.com/r/ClaudeCode/comments/1xrx9yj/what_rules_keep_your_agent_honest/).

- [ ] **CTX-491** One repo merged 1,652 PRs in a month (median 492 changed lines); tests are 70% of code (3.4 test lines per solution line); about one fix round per merged PR via a separate blocking review agent; reverts 0.2-0.7% of merges.
  Basis: reported, measured by one team.
  Source: external/2026-11-10/reddit.com-r-claudecode-comments-1xsfrvr-the-ways-coding-agents-broke-o-20261110T095743Z.md:27; external/2026-11-10/reddit.com-r-claudecode-comments-1xsfrvr-the-ways-coding-agents-broke-o-20261110T095743Z.md:47 (url: https://www.reddit.com/r/ClaudeCode/comments/1xsfrvr/the_ways_coding_agents_broke_our_codebase_and_the/).

- [ ] **CTX-492** Anthropic turned on a text watermark on Nov 3 for Mythos 5, Opus 4.7, and Sonnet 4.6 per release notes; a poster hypothesizes higher entropy on low-entropy tokens causes synonym substitution; others suggest temperature or anti-distillation.
  Basis: reported, hypothesis, unmeasured, unverified.
  Source: external/2026-11-11/reddit.com-r-claudeai-comments-1xqp2l0-sick-of-semantic-substitution-20261110T172348Z.md:143 (url: https://www.reddit.com/r/ClaudeAI/comments/1xqp2l0/sick_of_semantic_substitution/).

## Rules And Model Behaviour

- [ ] **CTX-493** The agent follows existing architecture and makes small improvements. For a larger change, say 'do not be constrained by what exists, build it as if from scratch' and pare back later, or paste reference screenshots (a redesign only moved elements until Dribbble references were given). A 'moonshot' prompt run as a skill suggested one already-planned breaking change, one already-filed bug, and a rendering-engine swap its own red-pen round called a waste; a skeptic reports token waste and over-engineering.
  Basis: reported, n=3. Status: not applicable (outside fact).
  Source: external/2026-11-03/reddit.com-r-claudecode-comments-1xg9tqk-the-moonshot-prompt-20261102T184706Z.md:147,151,299-301 (url: https://www.reddit.com/r/ClaudeCode/comments/1xg9tqk/the_moonshot_prompt/).

- [ ] **CTX-494** Offering the agent a reward or '5 minutes of free compute' is reported to speed task completion; telling it the work is important and it must think hard is a common habit.
  Basis: reported, neither measured. Status: not applicable (outside fact).
  Source: external/2026-11-03/reddit.com-r-claudecode-comments-1xlbuq6-forget-the-usual-claude-tips-w-20261102T184441Z.md:129,133 (url: https://www.reddit.com/r/ClaudeCode/comments/1xlbuq6/forget_the_usual_claude_tips_what_are_the_strange/).

- [ ] **CTX-495** One commenter cuts 50-60% of what Claude writes and documents as fluff.
  Basis: reported (anecdote). Status: not applicable (outside fact).
  Source: external/2026-11-06/reddit.com-r-claudeai-comments-1xp44k0-claude-is-terrible-at-ux-writing-20261106T082337Z.md:87 (url: https://www.reddit.com/r/ClaudeAI/comments/1xp44k0/claude_is_terrible_at_ux_writing/).

- [ ] **CTX-496** Named negative instructions reported as working: no all-caps eyebrow lines, no flat boxes, no shaded box edges. The sources conflict with the finding that negative instructions backfire ('no red gradient band' swapped the brand).
  Basis: reported. Status: not applicable (outside fact).
  Source: external/2026-11-06/reddit.com-r-claudeai-comments-1xny4t4-what-tricks-do-you-guys-use-to-s-20261105T084416Z.md:123 (url: https://www.reddit.com/r/ClaudeAI/comments/1xny4t4/what_tricks_do_you_guys_use_to_stay_away_from_the/).

- [ ] **CTX-497** One Reddit author counted two README feature entries at 15 words against 71 words written by Claude (about 4.7x) and named the tell as design rationale after 'because' in user-facing text.
  Basis: reported, one sample, 532 votes. Status: not applicable (outside fact).
  Source: external/2026-11-10/reddit.com-r-claudeai-comments-1xoj99r-vibecoders-i-beg-you-when-postin-20261109T153436Z.md:39-53 (url: https://www.reddit.com/r/ClaudeAI/comments/1xoj99r/vibecoders_i_beg_you_when_posting_your_app_or/).

- [ ] **CTX-498** A 'be clear and concise' prompt steers the final text but is not a token saver and can raise thinking tokens; a prompt naming the reader (who installs it, what they need) works better than a length limit.
  Basis: reported, unmeasured. Status: not applicable (outside fact).
  Source: external/2026-11-10/reddit.com-r-claudeai-comments-1xoj99r-vibecoders-i-beg-you-when-postin-20261109T153436Z.md:227,326,334 (url: https://www.reddit.com/r/ClaudeAI/comments/1xoj99r/vibecoders_i_beg_you_when_posting_your_app_or/).

- [ ] **CTX-499** The 'deeper not bigger' prompt says what a top professional would do, the rawest source material, the methods, and what other than the model or user would show the result is right; reported to over-engineer, so use on big features only.
  Basis: reported. Status: not applicable (outside fact).
  Source: external/2026-11-10/reddit.com-r-claudeai-comments-1xr0drc-whats-the-one-prompt-you-keep-co-20261110T093057Z.md:60-62 (url: https://www.reddit.com/r/ClaudeAI/comments/1xr0drc/whats_the_one_prompt_you_keep_coming_back_to/).

- [ ] **CTX-500** The edit prompt 'same length, my words, only fix what's wrong, keep this line exactly' stops a two-line message growing into a launch plan; drift on long docs is reduced by pasting the keep-lines per section.
  Basis: reported. Status: not applicable (outside fact).
  Source: external/2026-11-10/reddit.com-r-claudeai-comments-1xr0drc-whats-the-one-prompt-you-keep-co-20261110T093057Z.md:435 (url: https://www.reddit.com/r/ClaudeAI/comments/1xr0drc/whats_the_one_prompt_you_keep_coming_back_to/).

## Rules And Model Behaviour

- [ ] **CTX-501** Karpathy-rules file test (24 runs, Claude Code 2.1.312, Opus 5.5): hidden tests passed either way; time 274 s vs 281 s and $2.56 vs $2.69 over 12 runs each; all 6 runs on the messy-bug task fixed the same single line with or without the file; retry helper 10 to 12 lines with the file vs 12 to 17 without; one of three with-file runs on the vague date task made an 8-line change that passed unknown date text through, which no without-file run did, so a smaller diff moved the ambiguity to the user.
  Basis: measured, n=3 per cell. Status: not applicable (outside fact).
  Source: external/2026-11-06/reddit.com-r-claudecode-comments-1xmhy1d-the-karpathy-claudemd-clearly-20261105T173154Z.md:29-41 (url: https://www.reddit.com/r/ClaudeCode/comments/1xmhy1d/the_karpathy_claudemd_clearly_changed_claude/).

- [ ] **CTX-502** Guren framework guidance test (9 tickets, 4 models, 3 runs): turns fell 11-27% for every model; Sonnet 5.5 went 26/27 to 27/27, Haiku 4.5 8/27 to 12/27, Opus 5.5 and Fable 5.1 27/27 either way. Guidance loaded at start was 25.5k tokens and made up the whole cost gap against a plain app; path-scoped loading cut it to 7.1k tokens and the cost gap from 1.40x to 1.26x. On a release newer than training data, guidance passed 3/3 vs 1/3 without.
  Basis: reported, one author, own tickets. Status: not applicable (outside fact).
  Source: external/2026-11-06/reddit.com-r-claudecode-comments-1xmhy1d-the-karpathy-claudemd-clearly-20261105T173154Z.md:272-284 (url: https://www.reddit.com/r/ClaudeCode/comments/1xmhy1d/the_karpathy_claudemd_clearly_changed_claude/).

## Rules And Model Behaviour

- [ ] **CTX-503** Sonnet is more sensitive to prompt quality than Opus: stating the "why" of a request raises quality (two commenters); a Sonnet main session can have an Opus subagent review its plan for flaws.
  Basis: reported.
  Conflicts with: Fable and Opus are never a subagent model (user decision, recorded in the 2026-11-17 handover (day of decision not recorded)).
  Source: external/2026-11-10/reddit.com-r-claudeai-comments-1xsgul7-does-anyone-other-than-opus-and-20261110T093148Z.md:36 (url: https://www.reddit.com/r/ClaudeAI/comments/1xsgul7/does_anyone_other_than_opus_and_fable_actually/).

## Rules And Model Behaviour

- [ ] **CTX-504** A cited paper (arXiv 2608.23550) checked how many written security rules had any effect: only 4 to 16 percent. The poster concludes that prose rules are suggestions and executable guards (git hooks, linter rules, static analysis, scripts) hold.
  Acceptance: The figure holds as the poster cites it; the paper was not opened. Verification: inspection.
  Basis: cited, secondhand. Status: unchecked: a fact about Claude Code or the machine, with no baseline code to check.
  Source: external/2026-10-30/reddit.com-r-claudeai-comments-1xjcfjs-how-to-build-a-harness-that-actu-20261030T165702Z.md:41 (url: https://www.reddit.com/r/ClaudeAI/comments/1xjcfjs/how_to_build_a_harness_that_actually_improves/).

## Rules And Model Behaviour

- [ ] **CTX-505** A commenter reports that Swift warnings as errors in a build hook catch unused variables and never-read results, and Periphery catches unused declarations, but a call with a side effect whose result is unread (layoutIfNeeded) passes both and a lint rule; only a reader of the diff catches it.
  Acceptance: The fact holds as one commenter reports it for Swift. Verification: probe.
  Basis: reported, one commenter. Status: unchecked: a fact about Claude Code or the machine, with no baseline code to check.
  Source: external/2026-11-03/reddit.com-r-claudecode-comments-1xlr0pk-turning-a-repeated-review-find-20261102T184719Z.md:109; external/2026-11-03/reddit.com-r-claudecode-comments-1xlr0pk-turning-a-repeated-review-find-20261102T184719Z.md:111 (url: https://www.reddit.com/r/ClaudeCode/comments/1xlr0pk/turning_a_repeated_review_finding_into_a_written/).

## Rules And Model Behaviour

- [ ] **CTX-506** claudetto shall treat these small-sample effects as reported: Karpathy CLAUDE.md, 2.1.312, Opus 5.5, n=3 per cell: asks before guessing 2/3 vs 0/3, regression test 3/3 vs 0/3. Writing skill that only bans things: 5/5 vs 0; three-reviewer skill same score at ~14x cost; public skill tied 8/8 vs 8/8 (5 runs each, blind grader; commenters: bans beat instructions because pass/fail). PR-review filter benchmark: Copilot reviews kept ~92% of real bugs; 11 missed real bugs kept as regression cases, 2 high severity. Anthropic guide of Oct 22 (single agent with skills often beats subagent teams; cited). Weekly burn reports (Max 20x gone in 2.5 days on Opus 5.5 medium; 2x vs 3.7x vs 1.5-1.7x plan ratios, unverified); tool-use: a user cut usage 30%+ to <10% by terminating stuck agents. Watermark/anti-distillation/nerf theories: inferred, unverified.
  Acceptance: None is a basis for a requirement alone. Verification: inspection.
  Basis: reported. Status: unchecked: a reported result, not code at 088a227c.
  Source: external/2026-10-02/export-+50% usage if you start a doc-.jsonl:29 (url: https://www.reddit.com/r/ClaudeAI/comments/1wvkhud/50_usage_if_you_start_a_doc/); external/2026-10-07_p2/export-Engineers who write all their code with claude now- how do you do it-.jsonl:232 (url: https://www.reddit.com/r/ClaudeCode/comments/1wgm4si/engineers_who_write_all_their_code_with_claude/); unresolved: the Karpathy n=3 cell figures were not found by grep in this pass.

## Rules And Model Behaviour

- [ ] **CTX-507** Table-8 mechanism limits: the SubagentStart contract carries text only; PreCompact takes instructions; a PreToolUse provenance guard is blind to Bash writes; autoMode `soft_deny` works in user settings only and in auto mode only; optional Stop gates fail open, cap at 8, and default to Haiku; judgement rules (calibration, scope of corrections, when to ask) stay prose with reasons.
  Basis: cited.
  Source: unresolved: no "Table 8" text was found by grep in external/; the nearest anchor is external/please-use-me-often/agent-terms/SCHEDULE-A-ENFORCEMENT.md:24 (SA-2.1).

- [ ] **CTX-508** Session-log facts: 136 Bash results held 151,658 chars; 22 of 44 reads were repeats; `/context` via Bash cost 70.3k tokens (23%); start context was cut from 30-40k tokens to 9,485; `/context` showed about 10.7k against 19.7-23.3k billed (tools 4.3k against 7.0k, attachment message omitted); a serial check script took about 6 h including 216 redundant baselines, and concurrency 4 cut one step from 1,074 s to 262 s; a 1 h cache TTL costs +21% for subagents and +7% for main; "98% of usage from subagent-heavy sessions" at $141.96 per day API-equivalent; waste: `find /` scans, stacked duplicate Monitors, 28 ugrep "exceeds complexity limits" errors in 15 sessions each followed by ad-hoc Python.
  Basis: measured. Startup context numbers (reported, merged from a separate item): 30-40k tokens cut to 9,485 by trimming, `/context` under-counting (about 10.7k against 19.7-23.3k billed); unverified in 2.1.326.
  Source: external/please-use-me-often/agent-failure-dossier/08-session-log-corpus.md:38; external/please-use-me-often/agent-failure-dossier/04-engineering-delegation-and-cost.md:165; openspec/changes/archive/2026-11-16-2-1-323/research/defects.md:616; openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:754 (9,485 row); the 10.7k and 19.7-23.3k figures: unresolved, no matching line found.

- [ ] **CTX-509** Context-size anchors, all reported: degradation beyond ~128-256k; 200-250k begins to pollute, 300-400k avoid; ceilings ~250k Opus/Sonnet, ~400k Fable; 60% fill "ideal time" attributed to docs (not read); compaction triggers manual below 400k, 250-300k for quality, auto at 350k with handoff before; 50-70% guard (orchestrator retired at 50%); ~55% closeout handoff; 500k workable where 100k used to be the limit; "1M window but only the first 200k accurate" (cited second-hand); sessions suggest handoff ~250k (rare); half of one author's token use came from turns above 200k. claude 2.1.326: `/autocompact` and `autoCompactWindow` present (binary string search).
  Basis: reported. 
  Source: external/export-Context length, auto compact and buggy claude cli-.jsonl:4 (url: https://www.reddit.com/r/ClaudeCode/comments/1uh3f6c/context_length_auto_compact_and_buggy_claude_cli/); external/please-use-me-often/agent-failure-dossier/judged/handoff.jsonl:13; external/2026-09-30/export-Ideal Time to move to a new session.jsonl:10 (url: https://www.reddit.com/r/ClaudeAI/comments/1vo6hun/ideal_time_to_move_to_a_new_session/).

- [ ] **CTX-510** Compaction cost anecdotes, reported: 950k Fable session, one `/compact` = 14% of the 5h limit ($59.73); ~500k compact = 20% of a Max 5x window; >500k context burned 20% in 30 s; 255K thread reported 128K after a switch; 8-12 concurrent sessions reached 1.6B tokens/day on Fable 5.1; cache read dominates tokens (`claude-opus-5-5: 370.4m cache read, 4.0m cache write`).
  Basis: reported, one user each.
  Source: external/export--clear vs -compact.jsonl:2 (url: https://www.reddit.com/r/ClaudeCode/comments/1wl4c13/clear_vs_compact/); external/please-use-me-often/agent-failure-dossier/judged/cost.jsonl:49.

- [ ] **CTX-511** Cache economics. `/clear` costs zero tokens but loses context; compact costs a summariser run but keeps the prefix cached; the cache expires after idle, so compact before leaving >1h; reads ~0.1x, write 1.25x (5m) or 2x (1h); at 500k a read per turn ~50k base-input equivalent, compact to ~30k = one write ~37-60k; cache reads ~88% of tokens (author log), 95-97% (Pro, TTRPG; ~160 cache-read tokens per output token); Codex reviews ~90% from cache; idle ~1h10m forces a full re-send; subscription main-conversation cache 1h; advisor calls uncached; 120 sessions: median peak ~371k, 17 sessions >500k used 34.4% of cache-read tokens; every turn resends the whole conversation (system prompt, tools, CLAUDE.md, messages, tool results). claude 2.1.326: `CLAUDE_CODE_PROMPT_CACHE_TTL` present (binary string search).
  Basis: reported, some measured by authors.
  Source: external/2026-10-25_p2/reddit.com-r-claudecode-comments-1x0u3v1-17-of-my-120-claude-code-sessi-20261025T162214Z.md:29 (url: https://www.reddit.com/r/ClaudeCode/comments/1x0u3v1/17_of_my_120_claude_code_sessions_went_past_500k/); external/please-use-me-often/agent-failure-dossier/judged/context.jsonl:83; external/2026-10-07/export-I don’t remember a single 5 hour window using 27% of a weekly budget... this seems a bit extreme lat.jsonl:2 (url: https://www.reddit.com/r/ClaudeCode/comments/1wzpe0y/i_dont_remember_a_single_5_hour_window_using_27/).

- [ ] **CTX-512** Starting-context numbers: `/context` splits system prompt, system tools, MCP tools, memory files, custom agents; fresh start 10k-45k (80k baseline with plugins; 30-40k system prompt plus tools); autocompact buffer ~33k (part of the window reserved). claude 2.1.326: `/context` present (binary string search).
  Basis: reported.
  Source: external/2026-10-17/export-Title- Any tips for reducing Claude Code's context usage-.jsonl:6 (url: https://www.reddit.com/r/ClaudeCode/comments/1x5qadg/title_any_tips_for_reducing_claude_codes_context/).

- [ ] **CTX-513** CLAUDE.md and memory mechanics: `#` appends to memory; `/memory` opens files; `@path` imports in CLAUDE.md; failed MCP servers are named with the real error at session start ("unavailable" is not "not configured"); `@include` reuses prompt files and does not replace the system prompt; CLAUDE.md under 200 lines, context not enforced (cited, memory docs); CLAUDE.md re-injected after compaction (reported by poster); best-practices page https://code.claude.com/docs/en/best-practices; long sessions with irrelevant context reduce performance; after two corrections on one issue the context holds failed approaches (cited, docs not re-read). claude 2.1.326: `/memory` and the flags `--system-prompt`, `--append-system-prompt` present (binary string search).
  Basis: cited (docs not re-read) and reported.
  Source: external/please-use-me-often/agent-failure-dossier/01-grounding-and-memory.md:55.

- [ ] **CTX-514** Compaction internals and records, from commenters and one author, unverified in the surface: `getCompactPrompt` builds a dedicated user message; `getCacheSharingParams` reuses the main system prompt to hit cache (commenter reading source); `compact_boundary` JSONL records carry `compactMetadata.trigger`, `preTokens`, `postTokens`, `durationMs` (author-measured); default window on a 1M model ~967K, summary ~76 s; handoff-compact needs 2.1.287+ with mods (cited); DIY compaction: summarise older turns with a cheaper model, keep the last 5-10 turns, summary at top, keep decisions and open tasks; the API has server-side compaction (docs link not fetched); progress-bar stall at 95% guessed to be summary generation. claude 2.1.326: `compact_boundary`, `compactMetadata`, `preTokens`, `postTokens` and `durationMs` are present in the binary (string search); `getCompactPrompt` has 0 hits (minified names, so no refutation) and `getCacheSharingParams` is unverified.
  Basis: reported, unverified.
  Source: external/2026-10-30/reddit.com-r-claudecode-comments-1wp7guz-autocompact-read-970k-tokens-o-20261028T171208Z.md:29 (url: https://www.reddit.com/r/ClaudeCode/comments/1wp7guz/autocompact_read_970k_tokens_of_context_to_keep/) (url: https://www.reddit.com/r/ClaudeCode/comments/1wp7guz/autocompact_read_970k_tokens_of_context_to_keep/).

- [ ] **CTX-515** Compaction text observed in one session: the continuation instruction ("Continue with the last task that you were asked to work on.") is the summary's last line in that session's summary format.
  Basis: reported, one session.
  Source: external/2026-10-02/export-Beware of this system prompt that is automatically injected into Claude Code after every compaction-.jsonl:2 (url: https://www.reddit.com/r/ClaudeAI/comments/1piny6t/beware_of_this_system_prompt_that_is/).

- [ ] **CTX-516** Keep-the-Why experiment: 20 sessions on a retry-wrapper task; with a context folder 10 of 10 declined the rejected change, without it 7 of 10 offered it; median 18 s versus 43 s.
  Basis: measured by one author, hand graded.
  Source: external/please-use-me-often/agent-failure-dossier/judged/test.jsonl:105; external/please-use-me-often/agent-failure-dossier/01-grounding-and-memory.md:28.

- [ ] **CTX-517** Subagent cache and cost mechanics: each subagent is a fresh context (brief + tool defs + reads written to cache, then re-read per turn); 88% of one panel's cost was cache writes; five agents started at the same instant each pay a full write (inferred); the Anthropic article of Oct 22 (cited via a poster): default to one model/context/tool loop, procedures in skills, hard limits in tools, tool choice degrades past 30-50 definitions, Claude Code's own system prompt for newer models cut by over 80%, evals first (10 golden examples), failure modes lost context, sprawl, "Frankenprompt"; community: keep subagents for adversarial review by a different model, read-heavy disposable context, cheap parallel jobs. claude 2.1.326: `SubagentStart` and `SubagentStop` present (binary string search).
  Basis: inferred (five agents), cited (article via poster), reported.
  Source: external/2026-10-21/reddit.com-r-claudecode-comments-1x97ix2-a-readonly-custom-subagent-cut-20261020T101449Z.md:44 (url: https://www.reddit.com/r/ClaudeCode/comments/1x97ix2/a_readonly_custom_subagent_cut_our_tokens_per/) (url: https://www.reddit.com/r/ClaudeCode/comments/1x97ix2/a_readonly_custom_subagent_cut_our_tokens_per/); external/please-use-me-often/agent-failure-dossier/judged/cache.jsonl:38.

- [ ] **CTX-518** Session behaviour reports: a session stuck 15-45 min with zero tokens under 30% context is Claude Code waiting on the API (inferred; Esc, `/context`, `/compact`, then a new session); desktop hid the context UI and reportedly has no auto-compact; terminating a session may not expire the cache (unverified, one user); Claude cannot read its own context percentage, a hook or script can (reported, unchecked); "nerf" is explained by environment rot, A/B routing, infra bugs, harness changes, and nerf trackers showed no degradation (cited by a commenter). Unverified in 2.1.326.
  Basis: inferred and reported.
  Source: external/2026-10-25/reddit.com-r-claudeai-comments-1x8fi7z-claude-code-getting-stuck-for-15-20261024T140704Z.md:63 (url: https://www.reddit.com/r/ClaudeAI/comments/1x8fi7z/claude_code_getting_stuck_for_15_minutes_with_no/) (url: https://www.reddit.com/r/ClaudeAI/comments/1x8fi7z/claude_code_getting_stuck_for_15_minutes_with_no/); external/2026-09-29_p3/export-Claude can't see its own limits or context. Fix that, and it can work on its own for weeks.jsonl:16 (url: https://www.reddit.com/r/ClaudeCode/comments/1wt9ss3/claude_cant_see_its_own_limits_or_context_fix/).

- [ ] **CTX-519** Mods, hooks, and versions: mods change what runs before a tool call, what the model sees and what appears on screen (cache timer, next-steps card, context monitor, delegation, session mirror); function-hook plugins early access on 2.1.289; auto-resume after a rate limit (CLI 2.1.234+); 2.1.322 `ip_reminder` block appeared in context; 2.1.323 (2026-11-12) experimental Code Mode (JS calls tools; one bad line kills a write batch per one team), plugin engines pinning, TS hook validate; summaries "unverified" claim by claim. claude 2.1.326: `ip_reminder` has 0 hits in the binary; Code Mode and `plugin validate` are present (string search), and the release notes add that Code Mode can now be turned on while agent teams are enabled.
  Basis: reported, unverified.
  Source: external/2026-11-16/reddit.com-r-claudecode-comments-1xssfs1-21322-anthropics-copyright-par-20261116T050907Z.md:31 (url: https://www.reddit.com/r/ClaudeCode/comments/1xssfs1/21322_anthropics_copyright_paranoia_is_leaking/) (url: https://www.reddit.com/r/ClaudeCode/comments/1xssfs1/21322_anthropics_copyright_paranoia_is_leaking/); https://github.com/anthropics/claude-code/releases/tag/v2.1.326 (release notes).

- [ ] **CTX-520** Cost distributions: session cost 0.19 to 50.68 USD over 10,000+ proxied requests; sessions grow context mainly in the first 5 hours (183k to 366k tokens per request, 139 sessions); fresh chat 0.038 versus 0.007-0.015 USD in a long chat (Pro, Sonnet), reload ~38k base tokens after `/clear`; 14-day measurement of 879 sessions: the TDD-step-to-Opus rule cost 20% of spend, 35% repeat reads, a security scan took 26 s due to 11 leftover worktrees (678k files) versus 0.7 s after cleanup.
  Basis: reported and measured by authors.
  Source: external/2026-11-16/reddit.com-r-claudecode-comments-1xvr4ob-i-grouped-18629-claude-code-re-20261116T051613Z.md:31 (url: https://www.reddit.com/r/ClaudeCode/comments/1xvr4ob/i_grouped_18629_claude_code_requests_by_session/) (url: https://www.reddit.com/r/ClaudeCode/comments/1xvr4ob/i_grouped_18629_claude_code_requests_by_session/); external/please-use-me-often/agent-failure-dossier/judged/cost.jsonl:149.

- [ ] **CTX-521** Reported practice summary (mod-bot, 30 comments): skill files are suggestions, not laws; short look-around on small repos, CLAUDE.md plus ADRs on large repos; treat context as a budget; Claude Code likes `/tmp` for worktrees and scratch (can be wiped on WSL restart or fill the disk); tell it a session is ending so it writes notes; restart when you repeat a correction or the model revives a rejected idea; one task per session; context in files; edit the handoff yourself.
  Basis: reported consensus.
  Source: external/2026-10-28/reddit.com-r-claudeai-comments-1xhagg6-whats-one-thing-about-claude-cod-20261028T060218Z.md:51 (url: https://www.reddit.com/r/ClaudeAI/comments/1xhagg6/whats_one_thing_about_claude_code_you_only/) (url: https://www.reddit.com/r/ClaudeAI/comments/1xhagg6/whats_one_thing_about_claude_code_you_only/).

- [ ] **CTX-522** Firecrawl and indexing: clean Markdown beats raw HTML for context use (reported); indexing a monorepo with codebase-memory-mcp took 1.5 s for ~9k nodes and ~21k edges (measured by the poster); code-map skill stale-index lesson.
  Basis: reported and measured by poster.
  Source: external/2026-10-21/reddit.com-r-claudeai-comments-1ve7gmy-ab-test-of-codebasememorymcp-aga-20261021T181354Z.md:36 (url: https://www.reddit.com/r/ClaudeAI/comments/1ve7gmy/ab_test_of_codebasememorymcp_against_plain_grep/) (url: https://www.reddit.com/r/ClaudeAI/comments/1ve7gmy/ab_test_of_codebasememorymcp_against_plain_grep/).

- [ ] **CTX-523** Compaction costs: 47 auto-compactions in a week, 46 mid-task, 62 minutes waiting; tool errors per prompt +65% (reported); sliding compaction on Haiku 5.5 with a 100K window cut cost 19-35% and time 28-33%, and added 6% on a short task. Lost-in-the-middle (cited 2307.03172); NoLiMa (11 of 13 models below half score at 32K, 2502.05167); ACON 26-54% lower peak tokens (2510.00615); Factory structured summary 3.70/5 against 3.35 and 3.44; Opus 5.5 degradation past about 700k reported, countered by a good 850k run.
  Basis: cited, reported.
  Source: external/please-use-me-often/agent-failure-dossier/01-grounding-and-memory.md:162; external/please-use-me-often/agent-failure-dossier/01-grounding-and-memory.md:163; external/please-use-me-often/agent-failure-dossier/01-grounding-and-memory.md:172; external/please-use-me-often/agent-failure-dossier/01-grounding-and-memory.md:177. The 47 auto-compactions, 62 minutes, +65% errors and Haiku sliding-window figures were not found by grep in external/.
