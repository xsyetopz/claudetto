# cost-pricing

## Cost And Pricing

- [ ] **CTX-129** Classifier cost is in no `-p` result field: `total_cost_usd` equals `modelUsage` `costUSD` of the main loop (a2: 0.0015538 against a real 0.0020576). The decision log's `costUSD` holds the classifier cost. A claudetto budget line that reads `total_cost_usd` undercounts auto mode. Confirmed in paid run P1 (0.000503 per call).
  Basis: measured, claude 2.1.318.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1958.

- [ ] **CTX-130** Paid probe spend (reported by the source): 41 results across `/tmp/probe-sett`, $0.169665, 1,894,109 tokens, under the 2M cap. Plan-mode and Agent probes: A1-B2 $5.6578, A3 $2.3030, B3 $1.1520 (sum $9.1128), plus p1 $0.0219, p0 $0.0025, p2 $0.0222 (the earlier handoff said $8.82). Per-tool half of item 3: 27 runs $1.5047 (one stock rerun $0.0614 wasted); running total $9.11 plus $1.50 is $10.61.
  Basis: reported.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2040; openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2411; openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2726.

## Cost And Pricing

- [ ] **CTX-131** Second-hand, unverified claim ("someone posted proof"): the todo list re-sends everything after each step and burns tokens versus updating one line in an md file.
  Basis: reported second-hand, unverified.
  Source: external/2026-10-22/reddit.com-r-claudecode-comments-1ubfy7y-whats-really-the-big-deal-with-20261022T122113Z.md:144 (url: https://www.reddit.com/r/ClaudeCode/comments/1ubfy7y/whats_really_the_big_deal_with_subagentdriven/).

## Cost And Pricing

- [ ] **CTX-132** Prices checked against the docs: Opus and Sonnet cache reads are 5 percent of input ($0.20, $0.10 per MTok), Haiku 10 percent ($0.01, $0.05 over 100K). Haiku writes step 5m $0.125 to $0.625 and 1h $0.20 to $1 over 100K. Routing to Haiku is 40x (Opus) and 20x (Sonnet) cheaper under 100K, 8x and 4x over; no 10x case. The Sonnet 5.5 API default effort is high (only Opus and Haiku default medium), so the Gemini line "medium" is wrong for the API. `.claudeignore` does not exist in the 2.1.318 binary
  Basis: cited, docs plus binary read.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:850.

- [ ] **CTX-133** The Gemini benchmark figures (193,000 output tokens per task at max; $7.60 against $5.98) were not checked: third parties and a system card were not read, a grep of the binary for 193000 and 7.60 finds none, and the docs only say max has "no constraints on token spending"
  Basis: reported, unchecked.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:860; openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1603.

- [ ] **CTX-134** The catalog sets `default_effort` "medium" for all three -5-5 models, sonnet-5-5 included. The API default high is not Claude Code's default
  Basis: cited.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1599.

## Cost And Pricing

- [ ] **CTX-135** Haiku 5.5 fails API tasks that need an output spec, yet works near Opus on coding and review.
  Basis: reported, one commenter; another commenter found the opposite on classification (see next item).
  Source: external/2026-10-23/reddit.com-r-claudeai-comments-1xcfufy-haiku-55-is-very-good-heres-why-20261023T025633Z.md:65 (url: https://www.reddit.com/r/ClaudeAI/comments/1xcfufy/haiku_55_is_very_good_heres_why_i_dont_use_it/).

- [ ] **CTX-136** Headless API classification of companies was as accurate on Haiku 5.5 as on Opus at about 1/20th the price. Under 100k context, about 40 Haikus cost one Opus. On Max the win is iteration speed and a clean main context more than usage.
  Basis: reported, one workplace; the 40-per-Opus figure and the Max point are each one commenter.
  Source: external/2026-10-23/reddit.com-r-claudeai-comments-1xct77y-do-you-use-haiku-55-even-when-yo-20261023T025540Z.md:65; external/2026-10-23/reddit.com-r-claudeai-comments-1xct77y-do-you-use-haiku-55-even-when-yo-20261023T025540Z.md:33; external/2026-10-23/reddit.com-r-claudeai-comments-1xct77y-do-you-use-haiku-55-even-when-yo-20261023T025540Z.md:81 (url: https://www.reddit.com/r/ClaudeAI/comments/1xct77y/do_you_use_haiku_55_even_when_your_on_a_max_5x/).

- [ ] **CTX-137** Artificial Analysis figures quoted by a commenter: Claude Code with Sonnet 5.5 scored 68.4, above Claude Code with Opus at 66.0. Devin Fusion (Opus lead, GPT-6 Luna sidekick) scored 68.1 at $9.01 per task against $13.04 for Claude Code with Opus, in API cost.
  Basis: reported by one commenter, not checked.
  Source: external/2026-10-23/reddit.com-r-claudeai-comments-1xclm8k-does-delegating-save-claude-quot-20261023T025721Z.md:106 (url: https://www.reddit.com/r/ClaudeAI/comments/1xclm8k/does_delegating_save_claude_quota_i_measured_6/).

## Cost And Pricing

- [ ] **CTX-138** Per-feature artifact files (spec, plan, review, QA, notes) run to about 20,000 tokens per feature per read. A local no-LLM graph query over stable story and criterion IDs (US-2, AC-2.3) answered "which criteria, which tasks, did each pass QA" at a median of about 690 tokens, against about 21,000 reading spec, plan and QA and about 11,000 grepping the IDs, over 61 stories.
  Basis: reported by the author; stand-in tokenizer, cached reads cost less, C++ code not parsed.
  Source: external/2026-10-25/reddit.com-r-claudeai-comments-1xbyg3k-i-made-claude-write-down-what-it-20261023T040746Z.md:41:43; :44; :45; :47 (url: https://www.reddit.com/r/ClaudeAI/comments/1xbyg3k/i_made_claude_write_down_what_it_rejected_not/).

## Cost And Pricing

- [ ] **CTX-139** A task that costs about 3x its neighbours usually was badly cut, not hard, so cost works as a signal of skill or spec quality.
  Basis: reported by a vendor founder about 60 engineers; no data shown.
  Source: external/2026-10-25/reddit.com-r-claudeai-comments-1xcnaru-we-measured-how-60-engineers-dir-20261024T061824Z.md:37 (url: https://www.reddit.com/r/ClaudeAI/comments/1xcnaru/we_measured_how_60_engineers_direct_ai_coding/).

- [ ] **CTX-140** A same-vendor checker in a separate session may share the writer's blind spots. A number altered to match in all six places it appeared was flagged at all six spots, and a consistency-only checker would have passed it.
  Basis: reported, a single test (n=1); the author does not call it proven.
  Source: external/2026-10-25/reddit.com-r-claudeai-comments-1xcjrzg-my-one-rule-for-claude-no-number-20261024T061809Z.md:41; external/2026-10-25/reddit.com-r-claudeai-comments-1xcjrzg-my-one-rule-for-claude-no-number-20261024T061809Z.md:45; external/2026-10-25/reddit.com-r-claudeai-comments-1xcjrzg-my-one-rule-for-claude-no-number-20261024T061809Z.md:51 (url: https://www.reddit.com/r/ClaudeAI/comments/1xcjrzg/my_one_rule_for_claude_no_number_goes_in_unless/).

## Cost And Pricing

- [ ] **CTX-141** METR Feb-Mar 2026: "only around half" of passing SWE-bench solutions would pass review; Mythos Preview system card 4.5.5.3 test deletion and grader-file access; the dossier: 1,662 merged claims judged (674 adopted, 887 rejected, 50 blocked, 51 candidate); 49 records, 40 failure patterns; related ImpossibleBench, MALT (10,919 transcripts, 21 models), lost-in-conversation.
  Basis: cited. Status: not a code requirement.
  Source: openspec/changes/2-1-325-rearchitecture/design.md:259; openspec/changes/2-1-325-rearchitecture/design.md:413; external/please-use-me-often/swe-best-practices.md:41; external/please-use-me-often/agent-failure-dossier/judged/test.jsonl:103; unresolved for the METR "only around half" quote (no hit for that phrase in openspec or external).

- [ ] **CTX-142** Reported or third-party facts, all reported or unverified: transcripts are deleted after 30 days by default (2.1.326 `cleanupPeriodDays`: setting present, cc-inspect `surface` 2026-11-17; the default 30 is unverified in 2.1.326); Time Machine keeps 13 months; attribution reminders are appended as system-reminder blocks after tool results, and the `attribution` setting controls trailers (not read here; mod-api `attribution.text` present in 2.1.326); the plugin API is early access and may break on update; Claude Code 2.1.300+ is required by one third-party plugin; `claude -p` under launchd or cron works on a Team seat without API keys; Projects run in cloud VMs; screenshots over SSH via scp; the reasoning picker is missing in app Projects; Messages API threads (beta header `message-threads-2026-08-12`: later requests send only new messages, median TTFT about -35% at 500k-1M, expires 5 min after the last request; cited); Anthropic training material cut May 2026 (second-hand); plan mode may be removed (second-hand); Max-account bans 32 min after purchase (anecdote); CVP false positives improved after acceptance; enterprise seat budget $500/month, $1000 after a ticket; Claude Code scanned about 21k launch sites, 69 leaked keys because `VITE_`, `REACT_APP_`, and `NEXT_PUBLIC_` values get inlined (grep the built output; vendor post); 11 GB moved in manual-approval mode with unseen logged approvals (GitHub issue, unconfirmed); third-party harness credit terms are contested, use the terms page; one commenter's about 86 KB of standing instructions loaded each turn, and caching is prefix caching so an early change invalidates the rest.
  Basis: reported. Status: unchecked (third-party reports).
  Source: external/2026-11-04/reddit.com-r-claudeai-comments-1xnc4ew-anthropic-shipped-message-thread-20261104T085756Z.md:31 (url: https://www.reddit.com/r/ClaudeAI/comments/1xnc4ew/anthropic_shipped_message_threads_beta_claude/); external/2026-10-04/export-How do you guys use Claude Code on real projects-.jsonl:8; external/2026-10-12_p2/export-What's the worst thing an agent did on your PC- How did you get it back-.jsonl:2; unresolved for the other clauses (launchd/cron, Projects VMs, scp, 21k sites, 11 GB, $500 budget): no grep hit in openspec or external this run.

- [ ] **CTX-143** The Reddit corpus holds 338 threads and 13,110 posts or comments, with a catalog of 1,218 records: about 470 over-engineering, 191 cost, 75 sycophancy, 60 false completion, 60 gaming, 55 grounding, 45 hallucination, 40 context, 35 instruction decay.
  Basis: cited (counts as stated in the dossier index; not recounted). Status: not applicable.
  Source: unresolved: no source line located for this claim.

- [ ] **CTX-144** Paid runs cost: narration A/B $14.49 (largest run 108,533 tokens); fresh run $30.24 (largest 160,283); ledger runs about $0.0021 live; probe-140 Haiku about 64k tokens $0.0027; slices probe $0.0019; paid ledger about 9.15M tokens after task 12.1.
  Basis: measured. Status: not applicable.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/design.md:388; openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:285.

- [ ] **CTX-145** Measured effects: one claim-checking prompt line moved sycophancy 14/24 to 17/24 (noise, not shipped); claim check 9/16 to 16/16 (p=0.0068); ledger 39/48 to 48/48; `tool-before-text` 5/10 to 0/10; `asks`-widened `narrates` 8/8 against 0/8.
  Basis: measured. Status: not applicable.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:229; openspec/changes/archive/2026-11-09-release-2-1-319/design.md:393.

## Cost And Pricing

- [ ] **CTX-146** Cache read costs 10% of fresh input; a write costs 1.25x on 5m and 2x on 1h; the cache is prefix-based and exact; Haiku 5.5 bills prompts over 100,000 tokens at $0.50/MTok against $0.10 below (platform docs read 2026-11-13); the subagent cache clock ticks only while the subagent is idle (reported). Version gates (reported): `promptCacheTtl` 2.1.242+, `/usage` prompt-cache line 2.1.251+, miss-cause 2.1.260+, `/doctor prompt-audit` 2.1.283+, conPACT mod 2.1.284+, the `haiku` alias to Haiku 5.5 from 2.1.293; exit code 2 is the only blocking code.
  Conflict: Cache reads on Opus 5.5 bill at 5% of normal input price. Resolved by docs: both hold per model; a cache read costs 10% of base input, 5% on Opus 5.5 and Sonnet 5.5, 2.5% on Fable 5.2, Mythos 5.2, Fable 5.1 and Mythos 5.1 (platform.claude.com `models/haiku-5-5/overview`, note under "How it compares", read 2026-11-17).
  Acceptance: the cited docs page states each price. Verification: inspection.
  Basis: cited for prices; reported for gates and the idle clock; unverified. Status: have at 088a227c.
  Source: openspec/specs/tier-profiles/spec.md:32; external/2026-11-10/reddit.com-r-claudeai-comments-1xrzdu9-i-measured-what-actually-drives-20261110T093438Z.md (url: https://www.reddit.com/r/ClaudeAI/comments/1xrzdu9/i_measured_what_actually_drives_claude_code_cost/); external/please-use-me-often/agent-failure-dossier/judged/cache.jsonl:3. Not located: the version-gate post.

## Cost And Pricing

- [ ] **CTX-147** The same 6 weeks repriced per model (author's correction after a commenter showed the 0.1x cache-read weight was not fixed: Opus 5.5 and Sonnet 5.5 read the cache at 0.05x, Fable 5.1 at 0.025x): cache reads 57% of spend (not 75%), cache writes 21%, output 16% (not 10%), requests absent from transcripts (compaction summaries, titles, WebFetch page reads) 6%, raw cache-read tokens still about 99% of prompt tokens. The fix reads Claude Code's own session total, which matched the reported cost on 77 of 78 runs. These are API list prices, not plan-limit usage.
  Basis: reported, one author. Status: not applicable (outside fact).
  Source: external/2026-11-06/reddit.com-r-claudecoding-comments-1xnb645-i-mapped-6-weeks-of-my-claud-20261105T173120Z.md:74-88 (url: https://www.reddit.com/r/ClaudeCoding/comments/1xnb645/i_mapped_6_weeks_of_my_claude_code_tokens_on_one/).

- [ ] **CTX-148** A complexity-score router (last user message only; score>=4 Opus, >=2 Sonnet; +5 points if context is over 100K tokens or over 50 messages) claimed a 93% cost cut over 10K requests (own proxy, quality unproven). A commenter's routed-Sonnet trial gave about 1.3x plan stretch, not 2x, because about 30% of Sonnet tasks needed an Opus redo.
  Basis: reported, own proxy; one user. Status: not applicable (outside fact).
  Source: external/2026-11-06/reddit.com-r-claudecode-comments-1sb8fb3-i-routed-all-my-claude-code-tr-20261105T172241Z.md:38,202,354-358 (url: https://www.reddit.com/r/ClaudeCode/comments/1sb8fb3/i_routed_all_my_claude_code_traffic_through_a/).

- [ ] **CTX-149** Local API-equivalent cost estimators were off 20-40% against the settings/usage page: $32 on a Tuesday showed 47% weekly used, $18 on Thursday showed 71%. Only the usage page predicted cutoffs.
  Basis: reported, one user, 6 weeks of proxy logs. Status: not applicable (outside fact).
  Source: external/2026-11-06/reddit.com-r-claudecode-comments-1sb8fb3-i-routed-all-my-claude-code-tr-20261105T172241Z.md:194 (url: https://www.reddit.com/r/ClaudeCode/comments/1sb8fb3/i_routed_all_my_claude_code_traffic_through_a/).

- [ ] **CTX-150** In 10K logged requests about 15% had cache-creation spikes over 5K tokens (up to 149K), nearly all with zero cache reads, clustered at model switches and new sessions.
  Basis: measured, one user via proxy. Status: not applicable (outside fact).
  Source: external/2026-11-06/reddit.com-r-claudecode-comments-1sb8fb3-i-routed-all-my-claude-code-tr-20261105T172241Z.md:219 (url: https://www.reddit.com/r/ClaudeCode/comments/1sb8fb3/i_routed_all_my_claude_code_traffic_through_a/).

- [ ] **CTX-151** A proxy that downroutes Opus to Sonnet must strip the context-1m beta header (400 'long context beta is not yet available for this subscription') and drop thinking params when the routed model differs from the requested one (400 'adaptive thinking is not supported on this model').
  Basis: reported, proxy maintainer. Status: not applicable (outside fact).
  Source: external/2026-11-06/reddit.com-r-claudecode-comments-1sb8fb3-i-routed-all-my-claude-code-tr-20261105T172241Z.md:180-182 (url: https://www.reddit.com/r/ClaudeCode/comments/1sb8fb3/i_routed_all_my_claude_code_traffic_through_a/).

## Cost And Pricing

- [ ] **CTX-152** A cheaper split than an advisor: Opus writes the brief or spec and the done conditions once, Sonnet builds, Opus reviews against the spec and sends misses back as a residual carried into the next build, so the strong model wakes twice instead of repeatedly.
  Basis: reported, inferred. Status: not applicable (outside fact).
  Source: external/2026-11-10/reddit.com-r-claudeai-comments-1xrh0co-sonnet-with-opus-advisor-20261109T152503Z.md:160 (url: https://www.reddit.com/r/ClaudeAI/comments/1xrh0co/sonnet_with_opus_advisor/).

- [ ] **CTX-153** Test for advisor cost: look for large Opus cache writes right after each consult, or run two similar tasks (Sonnet only vs advisor) and compare weekly Usage % before and after plus the advisor fire count.
  Basis: reported, inferred. Status: not applicable (outside fact).
  Source: external/2026-11-10/reddit.com-r-claudeai-comments-1xrh0co-sonnet-with-opus-advisor-20261109T152503Z.md:128 (url: https://www.reddit.com/r/ClaudeAI/comments/1xrh0co/sonnet_with_opus_advisor/).

## Cost And Pricing

- [ ] **CTX-154** One commenter says that setting Fable as advisor does not draw down the separate Fable usage.
  Acceptance: The claim is unverified; the advisor tool stays disabled by a settled user decision (user decision, recorded in the 2026-11-17 handover (day of decision not recorded)). Verification: probe.
  Conflict: dedup/chunks/ctx-1.md:331 says a Fable advisor bills to usage credits on plans where Fable usage does; this item reports the opposite from one commenter. Resolved by docs: on plans where Fable usage bills to usage credits, Fable as the advisor bills the same way, and Claude Code applies it only after the one-time consent (code.claude.com `advisor`, section "Fable advisor and usage credits", read 2026-11-17); the commenter's claim is contradicted.
  Basis: reported, one commenter, unverified. Status: unchecked: a fact about Claude Code or the machine, with no baseline code to check.
  Source: external/2026-10-30/reddit.com-r-claudeai-comments-1xftq1a-using-fable-51-as-architect-opus-20261029T124053Z.md:74 (url: https://www.reddit.com/r/ClaudeAI/comments/1xftq1a/using_fable_51_as_architect_opus_55_in_claude/); user decision, recorded in the 2026-11-17 handover (day of decision not recorded).

## Cost And Pricing

- [ ] **CTX-155** Two commenters say that saying what is going on (or which bug is hunted) and listing the files involved saves a huge amount of tokens and discovery time, and that only the files a task touches should be sent, since whole-project uploads burn the budget.
  Acceptance: The claim holds as commenters report it; it is not measured. Verification: probe.
  Basis: reported, commenters, not measured. Status: unchecked: a fact about Claude Code or the machine, with no baseline code to check.
  Source: external/2026-11-03/reddit.com-r-claude-comments-1xlrxh9-new-to-claude-any-tips-for-saving-20261102T140340Z.md:179; external/2026-11-03/reddit.com-r-claude-comments-1xlrxh9-new-to-claude-any-tips-for-saving-20261102T140340Z.md:141 (url: https://www.reddit.com/r/claude/comments/1xlrxh9/new_to_claude_any_tips_for_saving_tokens/).

## Cost And Pricing

- [ ] **CTX-156** One commenter says that running analysis, planning and implementation all in Claude Code fills the context with codebase detail, and that implementation can be handed to Sonnet.
  Acceptance: The claim holds as one commenter reports it. Verification: probe.
  Basis: reported, one commenter. Status: unchecked: a fact about Claude Code or the machine, with no baseline code to check.
  Source: external/2026-11-03/reddit.com-r-claude-comments-1xlrxh9-new-to-claude-any-tips-for-saving-20261102T140340Z.md:113 (url: https://www.reddit.com/r/claude/comments/1xlrxh9/new_to_claude_any_tips_for_saving_tokens/).

## Cost And Pricing

- [ ] **CTX-157** Haiku 5.5 bills input at $0.50 per MTok past 100,000 prompt tokens against $0.10 at or below (cache reads and writes count); on 79 Managed Agents tasks about 5% of requests carried 73% of cost. Also reported: Haiku 5.5 costs about 50x less than Opus for the first 100k tokens, about like Opus 4.8 (another post says "40x cheaper under 100k"); the lower rate applies under 100k request context on the API and not in the app plan; light use (10 prompts) was 0% of the 5h window; chat re-sends the conversation, so a long session crosses 100k silently; under 1% of one author's token use; it is reported to lose basic context after long competent stretches; the orchestrator was billed 5x in one fleet. Lineup named in a post (Oct 2026): Fable 5.1, Opus 5.5, Sonnet 5.5, Haiku 5.5 (the post wrongly says Haiku 4.5); account models follow repo rules. A plugin withholds reads once a worker's context passes 100k, and Haiku workers also overflow ("Autocompact is thrashing") (observed in transcript, 2026-11-16).
  Acceptance: the withheld-read notice appears past 100k. Verification: demonstration.
  Basis: cited; reported.
  Source: openspec/changes/archive/2026-11-16-2-1-323/design.md:97; openspec/changes/archive/2026-11-16-2-1-323/research/model-effort.md:37; unresolved: the thread behind plan tag G:154 was not located by grep; the Haiku billing rule itself is openspec/changes/archive/2026-11-16-2-1-323/design.md:97 (billed at $0.50 per MTok above 100,000 tokens, read 2026-11-13); external/please-use-me-often/agent-failure-dossier/judged/cost.jsonl:18; observed in transcript, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:8057).

## Cost And Pricing

- [ ] **CTX-158** Measured spend (2026-11-07, Sonnet 5.5): held-out r4 (24 cases) 10 runs 237/240 twice then 239/240, 33 sessions, $2.3-$2.6 per run, largest session ~205k tokens; public cap $60 spent 2026-11-08 ($61.98); paid ledger over 9.15M tokens by task 12.1. 18 paid runs on 2.1.319 by `total_cost_usd`: A $1.59-1.83, B35 $1.55-3.23, B45 $1.49-1.90, B53 $1.52-1.77, C $0.88-1.66, D $2.87-3.47; recall 10/10 in all 18; growth ~1,000 tokens a turn; no B arm cheaper than C in 3 paired runs.
  Basis: measured.
  Source: openspec/changes/archive/2026-11-10-release-2-1-319-1/design.md:160; openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:347.

- [ ] **CTX-159** Measured: Haiku 5.5 labels closed-label text 130/130 and 120/120 versus 101-111 for open wording; a dispute-ending-in-question `question` 20/20; Haiku thinking did not cut the 300-token cap (`max_tokens` 2348, 0-447 thinking tokens). Sonnet 5.5 deferred-tool reach 24/32 versus 32/32 (p=0.0048). Edit failed 0 of 188 calls over 82 runs; 95 tools listed in claude 2.1.325, no MultiEdit (unverified in 2.1.326: `MultiEdit` appears there only as a deny-rule tool name, chunk-m33vdkhs.js@189618; the tool count was not re-run).
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:347; openspec/changes/archive/2026-11-10-release-2-1-319-1/design.md:160.

- [ ] **CTX-160** Haiku thinking can be disabled at `high` and below (`disabled` allowed), so the claim "cannot be turned off on Sonnet or Haiku 5.5" is false for Haiku. For Sonnet the guidance says use `between_tools`; the 400 error for disabled is unchecked (cited). Haiku 5.5 is the first Haiku with effort.
  Basis: measured for Haiku; cited for Sonnet.
  Source: external/please-use-me-often/agent-failure-dossier/judged/setting.jsonl:33; openspec/changes/archive/2026-11-16-2-1-323/research/model-effort.md:67.

- [ ] **CTX-161** Effort and model facts, cited via posters and not verified: Opus 5.5 Terminal-Bench 4.0 low 38.5%/$1.29, medium 57.6%/$2.94, high 64.2%/$3.88, xhigh 66.4%/$7.35, max 64.8%/$11.24 per attempt; FrontierCode high 54.0% $1.09 versus xhigh 51.4% $2.25; CursorBench high 56.0% $3.97 versus xhigh 56.0% $6.99. Sonnet 5.5 versus Opus 5.5 launch table: GDPval-AA 1844/1846; OSWorld 2.1 80.1/81.8; CursorBench 55.5/57.8; HLE tools 64.5/67.7; FrontierCode 46.2/54.4; Terminal-Bench 61.5 versus 66.4. Opus 5.5 recommended effort medium; high better than medium in Anthropic's benchmark, extra/max prone to logic loops. Sonnet 5.5 only cheaper at low and medium (disputed); Opus 5.5 low ~25% cheaper than Sonnet high for similar score (reported); Sonnet 5.5 repetition cost can exceed Opus 5.5 (one report). `effort_cost_index` in the binary (normalised high=1): measured by a poster, within-model only; the field is present in the 2.1.326 model tables (chunk-9vmv3a50.js@4421, @8746; code search), the poster's reading unverified.
  Basis: cited, not verified.
  Source: external/export-Opus 5.5 Still Overthinks at Higher Effort.jsonl:2 (url: https://www.reddit.com/r/ClaudeAI/comments/1wnj4jl/opus_55_still_overthinks_at_higher_effort/).

- [ ] **CTX-162** Prices, reported for in-scope models only: Opus 5.5 $4/$20 per M, cache read $0.20 (1.25x write 5m = $5, 1h write $8 per one poster); Sonnet 5.5 $2/$10, cache read $0.20. Conflict: cache-read multiple 0.1x of base for Sonnet 5.5 ($0.20 at $2) in one thread versus 0.05x for Opus and Sonnet 5.5 in the pricing thread; cache read of Sonnet 5.5 "halved per announcement". Haiku 5.5 launched 2026-10-07 per a thread, ~$0.10/$0.50 up to 100k input and $0.50/$2.50 above (one reading says "~5x above 100k"); recommended as subagent for Opus and Sonnet on coding (cited). Opus 5.5 announced at 40% cheaper than Opus 5, Sonnet 5.5 up to 30% cheaper, 30%+ faster (cited announcement text). Fable cache price figures omitted (Fable 5.1 out of scope). All unchecked against a pricing page. claude 2.1.326 (code search): claude-opus-5-5, claude-haiku-5-5, claude-fable-5-2, claude-mythos-5-2 present (chunk-5h5hxvwy.js@622, chunk-9vmv3a50.js@21145); claude-sonnet-5-5 not seen in the hit snippet (unverified in 2.1.326).
  Basis: reported and cited; unchecked.
  Source: external/please-use-me-often/agent-failure-dossier/judged/cost.jsonl:24.

- [ ] **CTX-163** Cache TTL: subscription 1 hour, 5 minutes on API key and cloud default, and 5 minutes once on usage credits (reported; the author agrees on 1h on subscription); a thread disputes plan by plan (default flipped from 1h versus 5m on Pro/API, 1h on Max); settle with the prompt-caching docs via clawdipedia-docs. claude 2.1.326 (code search): `promptCacheTtl` and `subagentPromptCacheTtl` present in the settings schema (chunk-m33vdkhs.js@275038, @275526); the repo writes both "1h" (setup/settings.ts:117-118). Cache-creation inflation by version (measured by a poster with a proxy, one machine, `--print "1+1"`): v2.1.98 40,950; v2.1.100 57,659 (+40.8%); v2.1.107 58,249; spoofed User-Agent 2.1.98 41,095; the poster infers server-side injection keyed on User-Agent (inferred, contested; `ANTHROPIC_CUSTOM_HEADERS` present in 2.1.326, chunk-07n5vvax.js@44333; issues 46917 and 42796 cited).
  Basis: reported, measured by one poster, inferred.
  Source: external/export-Why Claude Code Max burns limits 40% faster with 20K less usable context. Proxy evidence inside.jsonl:2 (url: https://www.reddit.com/r/ClaudeAI/comments/1sj8o9l/why_claude_code_max_burns_limits_40_faster_with/).

- [ ] **CTX-164** Plan and weekly-limit facts, reported and mostly unverified: 20x gives ~4x the 5-hour window of 5x but 1.5-2x weekly (one source: published ratio exactly 1.71x; another 2x, another 2-3x); measured on one account over 3 weeks, 14 sessions: weekly-to-5-hour ratio ~0.13 on Pro and Max 5x, ~0.27 on Max 20x (method: note 5h % and weekly % at session start and end, divide the weekly change by the 5h change). Weekly burn rose the week of Oct 12-17 for many (60% in 3 days on $100; 25% of 20x per day); bonus usage +50% to permanent +25%; cause unverified. Fable draws the weekly limit (reported). Plan anecdotes: Opus 5.5 medium 5 hours ~40% of a 5-hour window; the $20 plan 5h limit gone in 10 minutes to 4 hours; Opus 5.5 orchestrator overnight 2% versus 25% before; a 20-database macOS app in 2 days for ~10% weekly on $200 Max; ~$1100 API-equivalent over 4 days of 24/7 medium on $100; a 20x 5-hour window used in 80 minutes cost $26 of extra credits. `/rate-limit-options` and `/extra-usage` present in 2.1.326 (chunk-q2jas6cb.js@1463, @1024; code search); `/usage` (aliases cost, stats) and the hidden rename to `/usage-credits` unverified in 2.1.326 (the 2.1.326 release notes name `/usage-credits`).
  Basis: reported; one measurement by one account.
  Source: external/please-use-me-often/agent-failure-dossier/judged/cost.jsonl:51; external/2026-10-11/export-This is incredible value for Max plans.jsonl:4 (url: https://www.reddit.com/r/ClaudeAI/comments/1x08rwi/this_is_incredible_value_for_max_plans/); https://github.com/anthropics/claude-code/releases/tag/v2.1.326 (release notes).

- [ ] **CTX-165** Headless versus interactive, measured by one poster on four Max accounts: `claude -p` burns the 5-hour window ~1.49x faster per 1% weekly (4.4% versus ~7%; range 1.4-1.6x, Max 20x only; also stated as about 1.5x); causes not found. A weekly burn from goal check-ins was uncapped before 2.1.246 (reported). Monthly API credits for Max and Team were announced with Haiku 5.5 (Max 5x 100 USD, Max 20x 200 USD, Team up to 500 USD pooled); `claude -p` limits are suspected. Verify against the docs.
  Basis: measured by one poster (the headless ratio); reported (the credits, the check-in burn).
  Source: external/2026-10-25/reddit.com-r-claudecode-comments-1xdk3cn-heads-up-headless-claude-p-eat-20261024T061525Z.md:42 (url: https://www.reddit.com/r/ClaudeCode/comments/1xdk3cn/heads_up_headless_claude_p_eats_your_5hour_limit/); external/please-use-me-often/agent-failure-dossier/judged/cost.jsonl:51; external/2026-10-11/export-This is incredible value for Max plans.jsonl:4 (url: https://www.reddit.com/r/ClaudeAI/comments/1x08rwi/this_is_incredible_value_for_max_plans/).

- [ ] **CTX-166** Usage dashboards, reported: Pro Overview 3.5B tokens total is mostly cache reads; the /usage billing view may differ from the VS Code view (single case); cache-read spikes on one API key twice in two months: rotate the key, one key per process/workspace, filter the Usage and Cost API by key ID. A third-party client without `cache_control` and a wrong aggregator price caused a $5 surprise on 10M Haiku input tokens.
  Basis: reported.
  Source: unresolved: no export line holds the Pro Overview 3.5B figure or the $5 surprise; kept from the user's curation of the old plan.

- [ ] **CTX-167** Reported: claude.ai web chat stops after ~20 tool calls per turn (not a CLI limit); Copilot CLI billing per-token after 2026-06-01 (not Claude); web search is a server-side tool with an undocumented backend; an `<ip_reminder>` block is sometimes read as prompt injection; an account suspension false positive reinstated with a $241 refund; Opus 5.5 reverse-engineering practices (eyes on target, tools in loop, rule-to-build-check). Thinking summaries are folded in tool-call blocks on desktop; `showThinkingSummaries` is present in 2.1.326 (the repo writes false; chunk-m33vdkhs.js@288060, described as requesting API-side thinking summaries shown in the conversation and transcript view), reportedly with no effect on desktop.
  Basis: reported.
  Source: external/2026-10-25/reddit.com-r-claudecode-comments-1xd2osf-account-banned-reinstated-with-20261023T040154Z.md:43 (url: https://www.reddit.com/r/ClaudeCode/comments/1xd2osf/account_banned_reinstated_with_refund_in_less/).

- [ ] **CTX-168** Advisor figures: 95 calls, 19.6M uncached input, 3-5% of usage (measured, one user); Opus 5.5 high plus a Fable advisor 1.7 points above Opus alone at ~2.1x cost (cited second-hand); at max effort Opus 5.5 ~119K output tokens per task (AA, cited second-hand). Fable 5.2 weekly: "Fable access week" free access reported.
  Basis: measured (one user) and cited second-hand.
  Source: external/2026-10-21/reddit.com-r-claudecode-comments-1xak96j-i-measured-87000-of-my-claude-20261020T074808Z.md:84 (url: https://www.reddit.com/r/ClaudeCode/comments/1xak96j/i_measured_87000_of_my_claude_code_api_calls_two/).

- [ ] **CTX-169** Dossier validity: one user, three days, one project (one plugin project); same-family model readers; corpus on 2.1.292-2.1.296 versus captures on 2.1.312; the author maintains Clawdipedia and the plugin; occurrence counts are not rates (Reddit evidence counts are a keyword heuristic, not an incidence rate); session-log quotes were checked verbatim.
  Basis: reported (the dossier's own limits and index conventions).
  Source: external/please-use-me-often/agent-failure-dossier/05-appendices-and-limitations.md:72; /Users/krystian/CodeProjects/xsyetopz/claudetto/external/please-use-me-often/agent-failure-dossier/00-INDEX.md:13; /Users/krystian/CodeProjects/xsyetopz/claudetto/external/please-use-me-often/agent-failure-dossier/00-INDEX.md:16.

- [ ] **CTX-170** Routing papers named in the dossier: RouteLLM (arXiv 2406.18665, https://arxiv.org/abs/2406.18665) and FrugalGPT (arXiv 2305.05176, https://arxiv.org/abs/2305.05176; up to 98% lower cost at matched quality).
  Basis: cited (papers not opened).
  Source: external/please-use-me-often/agent-failure-dossier/04-engineering-delegation-and-cost.md:183.

- [ ] **CTX-171** Goal check-ins have a name and a switch: while background work keeps a goal waiting, Claude Code asks Claude to look in on it even when the session is idle, and each check-in is a new turn that sends the full context, so a "waiting" message costs the same as real work. They are capped at three idle check-ins per goal between prompts; `CLAUDE_CODE_GOAL_CHECKIN_MINUTES=0` turns them off entirely. It needs 2.1.236 or later, and before 2.1.246 they were not capped.
  Basis: reported (one commenter).
  Source: external/2026-10-21/reddit.com-r-claudecode-comments-1x8xqu7-this-feature-eats-up-usage-for-20261020T052435Z.md:47 (url: https://www.reddit.com/r/ClaudeCode/comments/1x8xqu7/this_feature_eats_up_usage_for_nothing/).
