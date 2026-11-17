# usage-quota

## Usage Meter, Quota, And Plans

- [ ] **CTX-762** Commit-check blocks over 7 days of logs (575 files): 230 blocks; 108 list only real files, 61 only .claude/worktrees/agent-* files, and 61 both. The block is a catch for 47% and in part for 27% more.
  Basis: measured.
  Source: openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:849.

- [ ] **CTX-763** Open-items and command checks over the same logs: 44 ask blocks in 19 sessions listed 108 items, of which 16 were questions or commands typed as items and 92 were numbered task lines copied from a task list (read; no catch names them a question). 46 command-form blocks in 17 sessions and 29 several-command blocks in 13 sessions hold real sudo and "! cd ... && git push" lines.
  Basis: measured.
  Source: openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:851.

- [ ] **CTX-764** Denial lines per day by rule (2,915 lines, 568 files; each count is an upper bound; the first and last days are partial, now 11-12 14:02; 265 lines carry no timestamp; part of 11-12 comes from this change's own probes). Day totals: 11-09 87, 11-10 825, 11-11 1,228, 11-12 510. Write 117, 631, 189. Read 443, 150, 52. Temp marker 65, 62, 137, 54. Answer-first 22, 58, 76, 113. Pipe exit code 46 and 14. Agent past 15 min 40 on 11-10 only. Loop with no time limit 23 and 10. PATH marker 16. Sandbox rewrite 12.
  Basis: measured.
  Source: openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:893,897-910.

- [ ] **CTX-765** Jev costs $0.042 per million input tokens, the basis for sending hook text to it.
  Basis: cited.
  Source: openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:64; openspec/changes/archive/2026-11-13-feat-2-1-321/proposal.md:7.

- [ ] **CTX-766** plugins/claudetto/hooks held 9,985 source lines on 12a3f8a1, the accretion baseline for the rebuild.
  Basis: measured.
  Source: openspec/changes/archive/2026-11-13-feat-2-1-321/proposal.md:9.

- [ ] **CTX-767** A noun one plugin adds reaches another plugin in a live session, but a consumer with a dependencies entry does not load alone, and the lab cannot test it.
  Basis: observed.
  Source: openspec/changes/archive/2026-11-13-feat-2-1-321/tasks.md:10.

## Usage Meter, Quota, And Plans

- [ ] **CTX-768** Model table (cited): Opus 5.5 $4/$20 per MTok, medium effort; Sonnet 5.5 $2/$10, default high (docs say medium for agentic coding); Haiku 5.5 from $0.10/$0.50; Fable 5.2 $8/$40, high; minimum Claude Code versions 2.1.280, 2.1.284, 2.1.293, 2.1.321. Cache read is 0.05x input for Opus and Sonnet 5.5, 0.025x for Fable 5.1 (reported). Agentic coding uses about 1000x chat tokens with 30x run variance (cited, arXiv 2604.22750); RouteLLM and FrugalGPT up to 98%; AgentDiet -39.9 to -59.7%; four agents at 200k are said to cost less than one at 800k (estimate); three agents hit 90% of a $100 plan in 4-5 h (reported).
  Basis: cited and reported. Status: not applicable.
  Source: external/2026-10-12_p2/export-How can you effectively use Claude to build products, rather than churning out -AI slop- that no one.jsonl:56 (url: <https://www.reddit.com/r/ClaudeAI/comments/1wzn4f6/how_can_you_effectively_use_claude_to_build/>).

- [ ] **CTX-769** Weekly burn (one user, CLI 2.1.292, Max): a night run on Opus xhigh with up to 3 subagents made 3,396 calls, 116M cache creation, 1,501M reads, and 1.63M output, which moved the weekly bar 35%; 5,469 calls in 24 h on Oct 7 did not; another user saw 3% of the 5 h window add 1% weekly, then 4%; Opus medium with subagents off beat xhigh with 3. Cross-vendor, a 10-repo task cost about 15% weekly on Codex against about 4% on Opus 5.5 (reported, no controls).
  Basis: reported. Status: not applicable.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1995.

- [ ] **CTX-770** Multi-agent research, cited: MAST 14 failure modes (2503.13657); CooperBench about 30% below single agent (2601.13295); scaling +80.8% on decomposable work against -70.0% on sequential (2512.08296); the Anthropic research system +90.2% at about 15x tokens; Systima fan-out 2.6x on Opus and 5.9x on Fable against sequential (reported, unverified); heterogeneous debate helps (2502.08788); best failure attribution 14.2% (2505.00212); out-of-scope rates 5.4-27.7% for CLI agents against 0.2-4.5% for OpenHands (2605.18583); SNARE 19.51% overeager (2605.28122); AgentSpec above 90% (2503.18666).
  Basis: cited (papers not opened). Status: not applicable.
  Source: external/please-use-me-often/agent-failure-dossier/04-engineering-delegation-and-cost.md:106.

- [ ] **CTX-771** Cited decay facts: system-prompt drift within 8 rounds [2402.10962]; multi-turn 39% below single-turn [2505.06120]; about 68% accuracy at 500 simultaneous instructions [2507.11538]; TRACE compiles corrections into runtime checks, preference violations 37.6% in-distribution and 2.0% out of distribution [2606.13174]; Accumulated Behavioral Rules 0% recurrence (the authors' own) [2607.13091]; Reflexion [2303.11366] and ACE keep lessons in an itemized playbook, ACE +10.6% [2510.04618]; drift is bounded and reminders help [2510.07777]. Compression that removed 38.4% of tool-output tokens raised billed cost 6.8% (r=0.15) [2607.12161]; turn count explains 84% of log cost variance [2610.15093]. A consequence: enforce with runtime checks and prefer fewer turns over token compression.
  Basis: cited (papers not opened). Status: not applicable.
  Source: external/please-use-me-often/agent-failure-dossier/01-grounding-and-memory.md:106; external/please-use-me-often/agent-failure-dossier/01-grounding-and-memory.md:120.

- [ ] **CTX-772** Multi-account reports: one user measured a 20x account at about 2-8% more weekly usage than two 5x accounts, with 4x the 5 h limit against 2x; another measured weekly about 28% per full 5 h session on 20x against 13-14% on 5x (weekly about 2x, 5 h 4x); an older measure gave 1.7x per seat; a dynamic adjustment by server load is suspected (inferred). Two 5x accounts hedge a runaway agent blocking a week; terms-of-service risk is disputed.
  Basis: reported. Status: not applicable.
  Source: unresolved: no source line located for this claim.

- [ ] **CTX-773** Headless billing (one poster, Pro, a single task, six runs): interactive entrypoints cost about 1.6-1.8% of the 5 h limit per API-equivalent dollar and headless (`sdk-py`, `claude -p`) about 5.2%, with 97-98% cache reads, so cache does not explain it; the transcript `entrypoint` field tells the mode. The poster's rule is bulk refactors interactive, headless for small scoped runs, and `/usage` compared before and after.
  Basis: reported. Status: not applicable.
  Source: external/2026-09-29_p2/export-Measured it- headless Claude Code (Agent SDK - claude -p) eats ~3x more of the 5-hour limit per toke.jsonl:2 (url: <https://www.reddit.com/r/ClaudeAI/comments/1wsijnv/measured_it_headless_claude_code_agent_sdk_claude/>).

- [ ] **CTX-774** Orchestration through tmux windows plus a send-message tool, instead of subagents, is in use (reported). A worktree per parallel session works, and with 3-4 sessions the coordination cost exceeds the token cost (reported). A monthly API credit grant on Max and Team is reported (eligible 7 days after subscribing; the `claude -p` credit move is rumour), to be settled against the docs through clawdipedia-docs first.
  Basis: reported. Status: not applicable.
  Source: unresolved: no source line located for this claim.

## Usage Meter, Quota, And Plans

- [ ] **CTX-775** Jev answers in 152-262 ms warm and 0.2-1.8 s on a first call, with confidence `(p_max-1/n)/(1-1/n)`; the `lhviet/jev-bridge` README says Haiku with a loose prompt called `jev_ask` in 5 of 6 runs. Jev timings: a real key answers 200 in 257 ms at $0.0033; a bogus key gives 401 in 140 ms, then Haiku takes 1400 ms at $0.0019; TTY Jev takes 170-239 ms against Haiku 1.9-3.7 s; `-p` has no terminal surface, so you-should-know shows no tip.
  Acceptance: the README states the 5-of-6 figure. Verification: inspection.
  Basis: reported. Status: have at 088a227c. measured.
  Source: external/2026-10-22/reddit.com-r-claudecode-comments-1xbxoza-my-claude-code-setup-it-runs-l-20261022T005342Z.md:84 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xbxoza/my_claude_code_setup_it_runs_like_a_small/>); openspec/changes/archive/2026-11-09-release-2-1-319/design.md:153; openspec/changes/2-1-325-rearchitecture/design.md:71.

## Usage Meter, Quota, And Plans

- [ ] **CTX-776** Several users reported Opus 5.5 usage dropping after launch and the same prompts consuming more on some days; one user reported bonus usage moving from +50% to a permanent +25%; quality complaints for Opus 5.5 (ignoring global instructions, bare minimum) came with no repro; "How is Claude doing today?" appeared 4-5 times a day (pressing good or bad shares the session with Anthropic); a commenter says Claude Code injects the user's email into the system prompt and commit authorship (issue number unchecked); remote control adds a conversation link to commit messages.
  Acceptance: each post states its claim. Verification: inspection.
  Basis: reported. Status: have at 088a227c.
  Source: external/2026-10-03/export-Mmmkay. I didn't believe others at first, but something is suddenly off with Opus 5.5.jsonl:2 (url: <https://www.reddit.com/r/ClaudeCode/comments/1wurd3e/mmmkay_i_didnt_believe_others_at_first_but/>); external/2026-10-04/export-Opus 5.5 - seems like it has begun.jsonl:9 (url: <https://www.reddit.com/r/ClaudeCode/comments/1wu17jz/opus_55_seems_like_it_has_begun/>). Not located: the email, bonus-usage, and "How is Claude doing" lines.

## Usage Meter, Quota, And Plans

- [ ] **CTX-777** One user on high effort reports 20% of weekly usage in one session where a week before they ran 4 to 5 sessions at max, so token use changed by about 90% in days; another says medium burned 20% of a Max 5 on two identical prompts.
  Basis: reported, unmeasured.
  Source: external/2026-10-25/reddit.com-r-claude-comments-1xclxdw-opus-55-is-so-good-remember-to-use-20261024T141513Z.md:466 (url: <https://www.reddit.com/r/claude/comments/1xclxdw/opus_55_is_so_good_remember_to_use_xhigh_effort/>).

- [ ] **CTX-778** Since about 9 Oct the 5-hour window looks about 15% bigger while the weekly limit barely moved, so a user who maxes every window hits the weekly cap after about 9% fewer windows; seen on all four accounts, provisional.
  Basis: measured, one poster, unconfirmed.
  Source: external/2026-10-25/reddit.com-r-claudecode-comments-1xdk3cn-heads-up-headless-claude-p-eat-20261024T061525Z.md:73 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xdk3cn/heads_up_headless_claude_p_eats_your_5hour_limit/>).

- [ ] **CTX-779** Max 5x raises the 5h window 5x but the weekly cap only about 2-3x; about 15% of weekly equals one 5h window; a 5x user burned the weekly cap in about 3 days.
  Basis: reported; the 2-3x figure is a poster impression, unconfirmed.
  Source: external/2026-10-27/reddit.com-r-claudeai-comments-1xb3ycs-stop-using-subagents-or-buying-5-20261026T132414Z.md:105 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xb3ycs/stop_using_subagents_or_buying_5x/>).

- [ ] **CTX-780** One Pro user on Opus 5.5 High reports hitting the weekly limit with 4 days left after a month of intensive use; another on Opus 5.5 "extra" reports only 10% of the weekly limit after a full day. Plan tiers differ.
  Basis: reported, unmeasured.
  Source: external/2026-10-26/reddit.com-r-aigamedev-comments-1xfcokl-advice-for-those-developing-gam-20261026T063549Z.md:401 (url: <https://www.reddit.com/r/aigamedev/comments/1xfcokl/advice_for_those_developing_games_with_ai_so_they/>).

- [ ] **CTX-781** A heavy user reports the same usage on the API would have cost 17,500 USD a month against a 200 USD Max 20x plan; a 20x plan lasts about 15-20 h/week on Fable only, 30-50 h on Opus only, and an estimated 100-120 h on Sonnet only.
  Basis: reported, his own test; the Sonnet figure is unconfirmed.
  Source: external/2026-10-26/reddit.com-r-anthropic-comments-1xcacgy-claude-limits-20261026T064230Z.md:224 (url: <https://www.reddit.com/r/Anthropic/comments/1xcacgy/claude_limits/>).

- [ ] **CTX-782** One user logs about 2,000 USD of API-equivalent usage per week on an x20 plan with 3-8 sessions and up to 6 concurrent subagents (70% Opus 5.5, 30% Sonnet 5.5), with sessions running to 800k-900k, and stays within limits, so reports of limit burn vary with workload.
  Basis: reported, one user, own token-tracking hook.
  Source: external/2026-10-26/reddit.com-r-anthropic-comments-1xcacgy-claude-limits-20261026T064230Z.md:112 (url: <https://www.reddit.com/r/Anthropic/comments/1xcacgy/claude_limits/>).

- [ ] **CTX-783** One commenter reports Opus 4.6 costs more of the weekly usage than Opus 5.5.
  Basis: reported, one user, unmeasured.
  Source: external/2026-10-25/reddit.com-r-claudeopus-comments-1xbxewx-after-being-on-opus-55-for-so-20261024T141009Z.md:179 (url: <https://www.reddit.com/r/Claudeopus/comments/1xbxewx/after_being_on_opus_55_for_so_long_i_forgot_how/>).

- [ ] **CTX-784** A commenter says Opus max thinking uses 5.5 times the usage of normal thinking, and that Haiku can execute Opus plans; another replies Haiku is too stochastic even as a judge.
  Basis: reported, one user each, unmeasured.
  Source: external/2026-10-26/reddit.com-r-anthropic-comments-1x7i9v1-i-went-from-exhausting-claude-c-20261026T064441Z.md:216 (url: <https://www.reddit.com/r/Anthropic/comments/1x7i9v1/i_went_from_exhausting_claude_codes_weekly_limits/>).

- [ ] **CTX-785** Long-lived interactive sessions in tmux that a script feeds messages cost about 1.07x the 5-hour meter of typing by hand, against 1.5x for `claude -p`; fresh `-p` alone is still 1.5x, so resume is not the cause. The interactive sample is about 8% of the author's work, so a strong hint only. The measure is on Max 20x.
  Conflict: A commenter who runs a gateway sees no -p versus interactive difference in subscription usage.
  Basis: measured, one poster.
  Source: external/2026-10-25/reddit.com-r-claudecode-comments-1xdk3cn-heads-up-headless-claude-p-eat-20261024T061525Z.md:129 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xdk3cn/heads_up_headless_claude_p_eats_your_5hour_limit/>).

- [ ] **CTX-786** A commenter who runs a gateway sees no -p versus interactive difference in subscription usage across hundreds of customers and says subscriptions inside an organization pay -p from an API credit pool. This conflicts with the 1.5x finding; the author says his finding concerns Max meters only and an API key has no 5-hour limit.
  Conflict: Long-lived interactive sessions in tmux that a script feeds messages cost about 1.07x the 5-hour meter.
  Basis: reported, one commenter, conflicting.
  Source: external/2026-10-25/reddit.com-r-claudecode-comments-1xdk3cn-heads-up-headless-claude-p-eat-20261024T061525Z.md:157 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xdk3cn/heads_up_headless_claude_p_eats_your_5hour_limit/>).

## Usage Meter, Quota, And Plans

- [ ] **CTX-787** Fable 5.2 is a bit more token efficient at medium but emits about 50-100% more output tokens at high, xhigh, and max, so run one effort level lower than usual; a user reported a task that cost Opus 20% of a 5 h limit took Fable 100% without finishing; the cost chart is logarithmic and Max costs about 5x any other setting.
  Basis: reported, one commenter's benchmark claim, no measure shown.
  Source: external/2026-11-10/reddit.com-r-claudeai-comments-1xs2wdl-fable-52-review-here-is-whats-ac-20261110T093116Z.md:346; external/2026-11-10/reddit.com-r-claudeai-comments-1xs2wdl-fable-52-review-here-is-whats-ac-20261110T093116Z.md:178; external/2026-11-10/reddit.com-r-claudeai-comments-1xs2wdl-fable-52-review-here-is-whats-ac-20261110T093116Z.md:83 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xs2wdl/fable_52_review_here_is_whats_actually_different/>).

- [ ] **CTX-788** One Ultra user: 3 h of two parallel orchestration chats on Fable 5.2 High used 20% of Fable usage plus 10% of regular usage, where Opus would use about 3-4%, about 2.5x Opus High cost; another says Fable is cheaper at equal effort level (conflict); a displayed 200k context was called a bug, normally 1M, cured by restart or update.
  Basis: reported, one user.
  Source: external/2026-11-10/reddit.com-r-claudeai-comments-1xs5rpr-have-you-tried-fable-52-20261110T093712Z.md:47; external/2026-11-10/reddit.com-r-claudeai-comments-1xs5rpr-have-you-tried-fable-52-20261110T093712Z.md:204 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xs5rpr/have_you_tried_fable_52/>).

- [ ] **CTX-789** One user: Fable on high cost $54 to review a larger project, $24 a small one, $4 a connector, and found bugs after several Opus, Sonnet, and other-vendor review passes; another says Fable and Opus find different bugs on the same state.
  Basis: reported, n=1 each.
  Source: external/2026-11-10/reddit.com-r-claudecode-comments-1xs6tkq-for-those-of-you-who-use-fable-20261110T095324Z.md:53 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xs6tkq/for_those_of_you_who_use_fable_daily_what_does_it/>).

- [ ] **CTX-790** Fable xhigh drained half of a 5-hour limit in a 15-minute session while Opus costs about 5-10% of that for the same task (5-10x cheaper).
  Basis: reported, one user, plan unknown.
  Source: external/2026-11-10/reddit.com-r-claudecode-comments-1xs6tkq-for-those-of-you-who-use-fable-20261110T095324Z.md:320; external/2026-11-10/reddit.com-r-claudecode-comments-1xs6tkq-for-those-of-you-who-use-fable-20261110T095324Z.md:321 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xs6tkq/for_those_of_you_who_use_fable_daily_what_does_it/>).

- [ ] **CTX-791** A Pro-plan user: Fable 5.5 High orchestrating a Sonnet 5.5 High agent for 3 hours used 60% of the 5-hour and 9% of the weekly allowance; the lead is told to orchestrate and not code, and to suggest which tasks suit other models; another run: Opus PM opens a new session per phase, Sonnet dev, Haiku QA.
  Basis: reported, one user.
  Source: external/2026-11-11/reddit.com-r-claudeai-comments-1xslvco-use-fable-with-sonnet-for-implem-20261110T172653Z.md:29; external/2026-11-11/reddit.com-r-claudeai-comments-1xslvco-use-fable-with-sonnet-for-implem-20261110T172653Z.md:47 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xslvco/use_fable_with_sonnet_for_implementation_and_your/>).

- [ ] **CTX-792** Fable spinning up 5 agents on one large task spent a Max plan's tokens in one hour.
  Basis: reported, 1 author.
  Source: external/2026-11-13/reddit.com-r-anthropic-comments-1xtmjep-fable-52-is-extremely-passive-20261111T234255Z.md:124 (url: <https://www.reddit.com/r/Anthropic/comments/1xtmjep/fable_52_is_extremely_passive/>).

- [ ] **CTX-793** Quota burn reports for Fable 5.2: about 2B tokens in 2 days; 3 sessions of 10-20 minutes burned a whole week; a 5 h window gone in 2 prompts; one author used 30% of weekly in 2 days.
  Basis: reported.
  Source: external/2026-11-13/reddit.com-r-claude-comments-1xtnyre-unpopular-opinion-i-am-back-on-opu-20261111T234044Z.md:29; external/2026-11-13/reddit.com-r-claude-comments-1xtnyre-unpopular-opinion-i-am-back-on-opu-20261111T234044Z.md:284 (url: <https://www.reddit.com/r/claude/comments/1xtnyre/unpopular_opinion_i_am_back_on_opus_55_after/>).

- [ ] **CTX-794** Launch offer: Fable may use up to half the weekly limit until the 16th, so a large jump on the 5 h bar is expected; three users reported 0 to 60% and 0 to 80% of the 5 h bar in one prompt on Fable 5.2.
  Basis: reported, 1 comment plus 3 users.
  Source: external/2026-11-13/reddit.com-r-claudeai-comments-1xtdfma-is-fable-52-actually-worse-than-20261111T233520Z.md:385; external/2026-11-13/reddit.com-r-claudeai-comments-1xtdfma-is-fable-52-actually-worse-than-20261111T233520Z.md:304 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xtdfma/is_fable_52_actually_worse_than_opus_55_in_most/>).

- [ ] **CTX-795** Fable 5.2 Medium prose reads like Opus 5.5 (concise), but "load bearing" came back within two prompts; Fable 5.2 free resets apply to the Fable-specific weekly limit only (accounts differ, one to six resets; one user said it freed 12% of the weekly while Fable still consumed it).
  Basis: reported.
  Source: external/2026-11-10/reddit.com-r-claudeai-comments-1xs2wdl-fable-52-review-here-is-whats-ac-20261110T093116Z.md:278; external/2026-11-10/reddit.com-r-claudeai-comments-1xs2wdl-fable-52-review-here-is-whats-ac-20261110T093116Z.md:282; external/2026-11-10/reddit.com-r-claudeai-comments-1xs2wdl-fable-52-review-here-is-whats-ac-20261110T093116Z.md:43 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xs2wdl/fable_52_review_here_is_whats_actually_different/>).

- [ ] **CTX-796** One poster's own workflow eval (not a leaderboard): Fable 5.2 74% at $0.062 and 74 s per run, Fable 5.1 69%, Opus 5.5 68% at $0.028 and 40 s, GPT-6.1 Sol 64% at $0.011, Haiku 5.5 55% at $0.0015.
  Basis: reported, one poster's eval.
  Source: external/2026-11-10/reddit.com-r-claudeai-comments-1xs2wdl-fable-52-review-here-is-whats-ac-20261110T093116Z.md:162; external/2026-11-10/reddit.com-r-claudeai-comments-1xs2wdl-fable-52-review-here-is-whats-ac-20261110T093116Z.md:164 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xs2wdl/fable_52_review_here_is_whats_actually_different/>).

- [ ] **CTX-797** Per Anthropic's FrontierCode chart cited in a bot summary: Fable 5.2 High 45.3% vs Opus 5.5 Xhigh 45.5% at about half the per-task cost; Fable Xhigh 49.1%.
  Basis: cited second-hand, unverified.
  Source: external/2026-11-10/reddit.com-r-claudecoding-comments-1xs84wp-tldr-fable-52-high-vs-opus-5-20261110T095106Z.md:41 (url: <https://www.reddit.com/r/ClaudeCoding/comments/1xs84wp/tldr_fable_52_high_vs_opus_55_xhigh_via/>).

- [ ] **CTX-798** The Fable model card warns that lower effort levels may cause the model to stop prematurely; a reporter says Fable 5.2 on Max is painfully slow and advises medium or high; another says it rushes to a "good enough" result unless given concrete self-evaluation instructions.
  Basis: cited (model card, second-hand) and reported.
  Source: external/2026-11-13/reddit.com-r-anthropic-comments-1xtmjep-fable-52-is-extremely-passive-20261111T234255Z.md:110; external/2026-11-13/reddit.com-r-anthropic-comments-1xtmjep-fable-52-is-extremely-passive-20261111T234255Z.md:114; external/2026-11-13/reddit.com-r-anthropic-comments-1xtmjep-fable-52-is-extremely-passive-20261111T234255Z.md:118; external/2026-11-13/reddit.com-r-anthropic-comments-1xtmjep-fable-52-is-extremely-passive-20261111T234255Z.md:128 (url: <https://www.reddit.com/r/Anthropic/comments/1xtmjep/fable_52_is_extremely_passive/>).

- [ ] **CTX-799** One user's rolling burn-multiplier table (Opus 5.5 medium = 1.00x; Low 0.40, High 1.41, XHigh 2.47, Max 4.10; Sonnet 5.5 0.21/0.32/0.67/1.67/4.09; Haiku 5.5 0.02/0.04/0.07/0.10/0.17; Fable 5.1 1.82/2.27/3.08/4.43/5.30) is derived from published API rates, not subscription rates; a commenter disputes it for subscription use.
  Basis: reported, inferred.
  Source: external/2026-11-10/reddit.com-r-claudecode-comments-1xrutks-how-to-keep-costs-down-20261110T100242Z.md:83; external/2026-11-10/reddit.com-r-claudecode-comments-1xrutks-how-to-keep-costs-down-20261110T100242Z.md:93 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xrutks/how_to_keep_costs_down/>).

## Usage Meter, Quota, And Plans

- [ ] **CTX-800** One 20x user's rough hours per weekly limit are Fable 5.1 15-20 h, Opus 5.5 30-40 h, Sonnet 5.5 60-80 h; a migration document grown over 18 months took 30%+ of tokens before work began.
  Acceptance: The fact is unverified in 2.1.326; hours vary by user, so this is a rough bound. Verification: probe.
  Basis: reported, one user. Status: unchecked: a fact about Claude Code or the machine, with no baseline code to check.
  Source: external/2026-10-28/reddit.com-r-claudecode-comments-1xgxv58-claude-max-20x-weekly-depleted-20261028T060713Z.md:556 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xgxv58/claude_max_20x_weekly_depleted_in_less_than_25/>).

- [ ] **CTX-801** One no-code Sonnet prompt in a new chat ate 12% of a weekly limit; another user's 5x weekly limit was estimated at 55M tokens and hit in 2 days.
  Acceptance: The fact is unverified in 2.1.326; Verification: probe.
  Basis: reported, unverified. Status: unchecked: a fact about Claude Code or the machine, with no baseline code to check.
  Source: external/2026-10-28/reddit.com-r-claudecode-comments-1xgxv58-claude-max-20x-weekly-depleted-20261028T060713Z.md:465; external/2026-10-28/reddit.com-r-claudecode-comments-1xgxv58-claude-max-20x-weekly-depleted-20261028T060713Z.md:779 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xgxv58/claude_max_20x_weekly_depleted_in_less_than_25/>).

- [ ] **CTX-802** A done signal that arrives late can mean the session stalled at the shared account usage limit, not that a hook broke: every session on one account draws from the same pool, and the 5-hour bucket can stall many concurrent sessions.
  Acceptance: The fact is unverified in 2.1.326; budget concurrent sessions per 5-hour bucket and check the usage window before the hook. Verification: probe.
  Basis: reported, one user. Status: unchecked: a fact about Claude Code or the machine, with no baseline code to check.
  Source: external/2026-10-30/reddit.com-r-claudeai-comments-1xc8eg5-running-many-claude-code-agents-20261029T123926Z.md:89 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xc8eg5/running_many_claude_code_agents_without/>).

- [ ] **CTX-803** One user reports 28.3 billion tokens over 10 days, about 13,100 to 15,400 dollars at API prices, against about 800 dollars a month for four Max 20x accounts.
  Acceptance: The figure is the user's own report, asked from the model, not a claudetto measurement. Verification: inspection.
  Basis: reported, one user. Status: unchecked: a fact about Claude Code or the machine, with no baseline code to check.
  Source: external/2026-10-31/reddit.com-r-claude-comments-1xixg9h-is-the-consensus-currently-that-fa-20261031T082729Z.md:217 (url: <https://www.reddit.com/r/claude/comments/1xixg9h/is_the_consensus_currently_that_fable_51_is/>).

- [ ] **CTX-804** One Pro user reports that one output or thinking token on Opus 5.5 medium is as expensive as 50 cache-read tokens, and that a handover at 150k context, a stripped CLAUDE.md and bundled commands gave about 10 five-hour sessions a week instead of 7.
  Acceptance: The figures hold as one user's tests of their own sessions. Verification: probe.
  Basis: reported, one Pro user. Status: unchecked: a fact about Claude Code or the machine, with no baseline code to check.
  Source: external/2026-10-30/reddit.com-r-claudeai-comments-1xj6245-tips-to-save-usage-and-how-its-a-20261030T103246Z.md:69; external/2026-10-30/reddit.com-r-claudeai-comments-1xj6245-tips-to-save-usage-and-how-its-a-20261030T103246Z.md:71; external/2026-10-30/reddit.com-r-claudeai-comments-1xj6245-tips-to-save-usage-and-how-its-a-20261030T103246Z.md:41 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xj6245/tips_to_save_usage_and_how_its_actually_calculated/>).

## Usage Meter, Quota, And Plans

- [ ] **CTX-805** Commenters report these recovery limits. /rewind covers files Claude edited with its editing tools, including later Bash changes to those same files; files touched only by Bash, most subagent edits and changes from other sessions are not generally covered, so it is session recovery and not a backup. A reviewed commit gives a known file state, and separate worktrees keep parallel sessions off the same files; neither protects a database or reverses an API call. An email sent, a row deleted in a live database and a deploy cannot be undone from git. Claude Code docs say deny rules still apply in bypassPermissions and a PreToolUse hook can block a call before it runs.
  Acceptance: The facts hold as commenters report them; one cites the docs, which were not opened here. Verification: probe.
  Basis: reported, commenters; cited (docs, secondhand). Status: unchecked: a fact about Claude Code or the machine, with no baseline code to check.
  Source: external/2026-11-02/reddit.com-r-claudeai-comments-1xk277d-how-often-has-a-coding-agent-don-20261031T105244Z.md:57; external/2026-11-02/reddit.com-r-claudeai-comments-1xk277d-how-often-has-a-coding-agent-don-20261031T105244Z.md:59; external/2026-11-02/reddit.com-r-claudeai-comments-1xk277d-how-often-has-a-coding-agent-don-20261031T105244Z.md:61; external/2026-11-02/reddit.com-r-claudeai-comments-1xk277d-how-often-has-a-coding-agent-don-20261031T105244Z.md:104 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xk277d/how_often_has_a_coding_agent_done_something_you/>).
