# model-behaviour

## Model Behaviour

- [ ] **CTX-556** Measured cheap-decision-model (Jev) trap: each extra round trip resends 60-75k tokens of context to the orchestrator, so on a 14-issue backlog the Jev run used more Opus tokens than Opus reading the issues; break-even about 45-60 issues (15-20k tokens of bodies). On 267 closed issues Opus used 1.7M against 9.5M tokens (5.7x fewer raw, about 4x cost-weighted); Jev made 223 calls for $0.014; verdicts agreed 208 of 223, Jev the stricter.
  Basis: measured, one author.
  Source: external/2026-10-22/reddit.com-r-claudecode-comments-1xbxoza-my-claude-code-setup-it-runs-l-20261022T005342Z.md:98 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xbxoza/my_claude_code_setup_it_runs_like_a_small/>).

## Model Behaviour

- [ ] **CTX-557** Haiku 5.5 chat rule: past about 5 prompts in one thread move to Sonnet, because Haiku asks for the same information again; it forgot to write decisions to the database and to close open issues and claimed it recorded them while re-asking, so as a subagent it needs a handler.
  Basis: reported, one user.
  Source: external/2026-10-23/reddit.com-r-claudeai-comments-1xcfufy-haiku-55-is-very-good-heres-why-20261023T025633Z.md:33 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xcfufy/haiku_55_is_very_good_heres_why_i_dont_use_it/>).

## Model Behaviour

- [ ] **CTX-558** A commenter cites Anthropic's September 2025 postmortem as confirming three infrastructure bugs that degraded output for weeks, in a list of nerf explanations: A/B routing, infra bugs, distillation, harness changes, release prep.
  Basis: reported by a commenter, not checked.
  Source: external/2026-10-25/reddit.com-r-claude-comments-1xarg51-opus-55-officially-nerfed-20261025T075210Z.md:76; external/2026-10-25/reddit.com-r-claude-comments-1xarg51-opus-55-officially-nerfed-20261025T075210Z.md:77 (url: <https://www.reddit.com/r/claude/comments/1xarg51/opus_55_officially_nerfed/>).

- [ ] **CTX-559** One user reports Opus 5.5 effort showing medium after starting on high with no change by the user. Another dropped xhigh to high, then medium, over two weeks with no visible quality loss.
  Basis: reported, one user each.
  Source: external/2026-10-25/reddit.com-r-claude-comments-1xarg51-opus-55-officially-nerfed-20261025T075210Z.md:139; external/2026-10-25/reddit.com-r-claude-comments-1xarg51-opus-55-officially-nerfed-20261025T075210Z.md:312 (url: <https://www.reddit.com/r/claude/comments/1xarg51/opus_55_officially_nerfed/>).

- [ ] **CTX-560** A commenter reports tracker numbers: nerf-bench moved from -5% to +5%; Margin Lab shows Opus 5.5 at a 77% pass rate today, 76% over 7 days, 81% over 30 days.
  Basis: reported by a commenter, not checked.
  Source: external/2026-10-25/reddit.com-r-claude-comments-1xc9mw9-has-opus-55s-coding-quality-change-20261024T141240Z.md:129; external/2026-10-25/reddit.com-r-claude-comments-1xc9mw9-has-opus-55s-coding-quality-change-20261024T141240Z.md:130 (url: <https://www.reddit.com/r/claude/comments/1xc9mw9/has_opus_55s_coding_quality_changed_recently/>).

- [ ] **CTX-561** Context quality is ideal up to about 150K tokens and degrades at 250-300K even on a 1M window (anecdotal). Opus 4.6 is preferred for conversation and concision, 5.5 is smarter but flatter, harness prompts flatten tone, and 5.5 at low effort feels most like 4.6 (opinion).
  Basis: reported. Status: not applicable.
  Source: unresolved: no source line located for this claim.

- [ ] **CTX-562** Sonnet 5.5 cost more per task than Opus 5.5 Max at max effort ($7.60 against $5.98 per AA task; 193k output tokens); Haiku hidden thinking mode tripled tokens, and off it is about 50% cheaper than Sonnet 5.5 low (reported).
  Basis: reported. Status: not applicable.
  Source: external/please-use-me-often/agent-failure-dossier/judged/cost.jsonl:37.

- [ ] **CTX-563** Compaction costs more tokens than it saves (reported by other users, 2026-11-09); a current handoff file plus `/clear` at a milestone while the cache is warm works better; small subagent tasks on a lesser model save tokens; hooks that inject a skill at session start and after compaction work "reasonably" on Opus 5.5. Not measured. The 2.1.326 release notes say automatic compaction in plan mode now uses the model answering you, such as Opus with `opusplan`, so it can cost more. Auto-compaction runs on the session model at 5m TTL: 434 compactions in a week, 2.8% of tokens. The 2.1.326 notes add that automatic compaction in plan mode uses the model answering the user, such as Opus with `opusplan`, so it can cost more.
  Basis: reported. Status: not applicable. inferred (from a log).
  Source: <https://github.com/anthropics/claude-code/releases/tag/v2.1.326> (release notes); unresolved: no source line located for the reports; openspec/changes/archive/2026-11-16-2-1-323/research/issues-2026-11-09.md:78; <https://github.com/anthropics/claude-code/releases/tag/v2.1.326> (release notes).

- [ ] **CTX-564** Third-party tip threads are kept as mentions only: ASD-STE100 for skills (the repo already cites it), weekly-limit complaint threads, and a worktree-coordination thread in which one deploy or test worker owns the environment and reports per commit SHA. They carry no measurements.
  Basis: reported. Status: not applicable.
  Source: unresolved: no source line located for this claim.

## Model Behaviour

- [ ] **CTX-565** A user reports the built-in you-should-know agent said Fable 5.2 "was trained with deliberate limits" on optimization and frontier-risk work (a CPU inference hill-climb), so a worse result may be the model's safeguard, not the prompt; the Fable 5.2 announcement carries an "AI research and development" safeguard header; a commenter says the screenshotted prompt is not found in the installed repo.
  Basis: reported, one screenshot, disputed, unverified.
  Source: external/2026-11-10/reddit.com-r-claudeai-comments-1xsbmk1-youshouldknow-fable-52-may-be-sa-20261110T093112Z.md:31 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xsbmk1/youshouldknow_fable_52_may_be_sandbagging_you/>); external/2026-11-10/reddit.com-r-claudeai-comments-1xsgmyv-found-this-in-fable-52s-default-20261110T093106Z.md:139; external/2026-11-10/reddit.com-r-claudeai-comments-1xsgmyv-found-this-in-fable-52s-default-20261110T093106Z.md:149 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xsgmyv/found_this_in_fable_52s_default_system_prompt_in/>).

- [ ] **CTX-566** After Opus said no more speedup was possible on an 80k-agent simulation, Fable found about 25% more performance; others report 6% and about 40% (Fable planning with Opus agents coding) on rendering and perf work.
  Basis: reported, anecdotal.
  Source: external/2026-11-10/reddit.com-r-claudecode-comments-1xs6tkq-for-those-of-you-who-use-fable-20261110T095324Z.md:178; external/2026-11-10/reddit.com-r-claudecode-comments-1xs6tkq-for-those-of-you-who-use-fable-20261110T095324Z.md:196 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xs6tkq/for_those_of_you_who_use_fable_daily_what_does_it/>).

- [ ] **CTX-567** For a periodic fleet check-in, Sonnet "spaced out" and missed inefficiencies, while Opus went off on tangents and invented non-existent security requirements that wasted the fleet's resources; Fable did it right.
  Basis: reported, one user.
  Source: external/2026-11-10/reddit.com-r-claudecode-comments-1xs6tkq-for-those-of-you-who-use-fable-20261110T095324Z.md:222 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xs6tkq/for_those_of_you_who_use_fable_daily_what_does_it/>).

- [ ] **CTX-568** Reported Fable 5.2 use: a full code review of a 100k-line game found 31 improvements including a physics tick lower than display tick; another review found about 50 bugs Opus did not on the same code; Opus 5.5 high twice found fewer than Fable.
  Basis: reported, 3 authors, no baseline measured.
  Source: external/2026-11-13/reddit.com-r-aigamedev-comments-1xtallk-is-fable-52-and-improvement-ove-20261111T233500Z.md:35; external/2026-11-13/reddit.com-r-aigamedev-comments-1xtallk-is-fable-52-and-improvement-ove-20261111T233500Z.md:180; external/2026-11-13/reddit.com-r-aigamedev-comments-1xtallk-is-fable-52-and-improvement-ove-20261111T233500Z.md:182; external/2026-11-13/reddit.com-r-aigamedev-comments-1xtallk-is-fable-52-and-improvement-ove-20261111T233500Z.md:261 (url: <https://www.reddit.com/r/aigamedev/comments/1xtallk/is_fable_52_and_improvement_over_opus_55_for_game/>).

- [ ] **CTX-569** Models "fake it over the finish line" on projects with messy multi-faceted acceptance criteria, but work well when boxed in with exhaustive closed-form tests.
  Basis: reported, 1 author.
  Source: external/2026-11-13/reddit.com-r-claude-comments-1xtnyre-unpopular-opinion-i-am-back-on-opu-20261111T234044Z.md:126 (url: <https://www.reddit.com/r/claude/comments/1xtnyre/unpopular_opinion_i_am_back_on_opus_55_after/>).

- [ ] **CTX-570** One author says telling Fable it is "a big strong capable frontier model" cures its laziness; another suspects A/B testing for opposite experiences.
  Basis: reported, no check.
  Source: external/2026-11-13/reddit.com-r-claude-comments-1xtnyre-unpopular-opinion-i-am-back-on-opu-20261111T234044Z.md:392 (url: <https://www.reddit.com/r/claude/comments/1xtnyre/unpopular_opinion_i_am_back_on_opus_55_after/>).

- [ ] **CTX-571** Reported Fable 5.x wins: decompilation moved ahead in 1 hour where Opus 5.5 was stuck in one function across more than 10 agents; a roadmap of 26 dependency-checkpointed tasks where Opus gave only the next 5 steps regardless of effort; a use-after-free found in a public library; a shader and a portfolio site fixed on first pass when told "full creative freedom".
  Basis: reported, anecdotes, n about 8.
  Source: external/2026-11-13/reddit.com-r-claudeai-comments-1xta14a-examples-of-fable-doing-things-m-20261111T233719Z.md:88; external/2026-11-13/reddit.com-r-claudeai-comments-1xta14a-examples-of-fable-doing-things-m-20261111T233719Z.md:260; external/2026-11-13/reddit.com-r-claudeai-comments-1xta14a-examples-of-fable-doing-things-m-20261111T233719Z.md:228; external/2026-11-13/reddit.com-r-claudeai-comments-1xta14a-examples-of-fable-doing-things-m-20261111T233719Z.md:45 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xta14a/examples_of_fable_doing_things_much_better_than/>).

- [ ] **CTX-572** A team reports a Fable 5.2 custom harness without discovery steps is "orders of magnitude" cheaper in tokens than Claude Code's discovery-based exploration; 5.5 may suit harnesses that must read hundreds of millions of tokens to learn an architecture.
  Basis: reported, 1 author, no numbers.
  Source: external/2026-11-13/reddit.com-r-claudeai-comments-1xtdfma-is-fable-52-actually-worse-than-20261111T233520Z.md:270 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xtdfma/is_fable_52_actually_worse_than_opus_55_in_most/>).

- [ ] **CTX-573** Anthropic published a guide with about ten rules for prompting Fable 5.2.
  Basis: reported by a commenter, not read.
  Source: external/2026-11-13/reddit.com-r-claudeai-comments-1xtdfma-is-fable-52-actually-worse-than-20261111T233520Z.md:490 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xtdfma/is_fable_52_actually_worse_than_opus_55_in_most/>).

- [ ] **CTX-574** One commenter runs a daily benchmark on Opus 5.5 and says it is strictly identical since launch, against reports of a quality drop.
  Basis: reported, 1 author, no data shown.
  Source: external/2026-11-13/reddit.com-r-claudeai-comments-1xtyq0y-fable-52-wakes-up-opus-55-20261112T231243Z.md:58 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xtyq0y/fable_52_wakes_up_opus_55/>).

- [ ] **CTX-575** Tasks the agent cannot verify in place lower the quality of every model.
  Basis: reported.
  Source: external/2026-11-10/reddit.com-r-claudeai-comments-1xsgul7-does-anyone-other-than-opus-and-20261110T093148Z.md:50 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xsgul7/does_anyone_other_than_opus_and_fable_actually/>).

- [ ] **CTX-576** Giving 2-3 past reports as examples in a Project moves output more than model choice; Sonnet matches Opus quality on many small well-defined tasks at lower cost.
  Basis: reported.
  Source: external/2026-11-10/reddit.com-r-claudeai-comments-1xshd7l-models-and-use-cases-what-works-20261110T093140Z.md:41 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xshd7l/models_and_use_cases_what_works_best/>).

- [ ] **CTX-577** Cross-harness test: DeepSeek 4.1 Flash matched Opus 5.5 and Kimi on a QA and security task list, GLM 5.3 Flash missed much; both strong models omitted file:line in findings; the setup needs hooks to force each model to follow rules.
  Basis: reported, one user, other vendors.
  Source: external/2026-11-10/reddit.com-r-claudecode-comments-1xn18cu-does-delegating-to-cheaper-mod-20261110T100050Z.md:156; external/2026-11-10/reddit.com-r-claudecode-comments-1xn18cu-does-delegating-to-cheaper-mod-20261110T100050Z.md:158 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xn18cu/does_delegating_to_cheaper_models_actually_save/>).

## Model Behaviour

- [ ] **CTX-578** Amazon Bedrock keeps a model available about a year after Anthropic removes it.
  Basis: reported. Status: not applicable (outside fact).
  Source: external/2026-11-04/reddit.com-r-claudeai-comments-1xmcdri-opus-55-for-code-opus-46-for-ide-20261104T090223Z.md:60 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xmcdri/opus_55_for_code_opus_46_for_ideas_and/>).

## Model Behaviour

- [ ] **CTX-579** PR-review replay: Sonnet found 13 real findings plus 7 false positives (about 50% extra), Opus 13 real plus 1 false positive.
  Basis: reported. Status: not applicable (outside fact).
  Source: external/2026-11-04/reddit.com-r-claudeai-comments-1xmn6qp-is-sonnet-actually-any-worse-at-20261104T090031Z.md:189 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xmn6qp/is_sonnet_actually_any_worse_at_executing_tasks/>).

## Model Behaviour

- [ ] **CTX-580** A cited paper (arXiv 2610.01023) says weaker models are acceptable as judges when the checks are decisive.
  Acceptance: The claim holds as one commenter cites it; the paper was not opened. Verification: inspection.
  Basis: cited, secondhand. Status: unchecked: a fact about Claude Code or the machine, with no baseline code to check.
  Source: external/2026-10-31/reddit.com-r-claude-comments-1xixg9h-is-the-consensus-currently-that-fa-20261031T082729Z.md:240 (url: <https://www.reddit.com/r/claude/comments/1xixg9h/is_the_consensus_currently_that_fable_51_is/>).

## Model Behaviour

- [ ] **CTX-581** Harness matters as much as model: the SNARE framework explains about 56% of the variance in overeager behaviour against about 21% for the model [2605.28122]; harness alone costs 5-30x (catalog Cat 24:3 citing [2608.01347]; the multiplier is the catalog's). Opinion on Opus 5.5 is split: the majority says heavy harnesses (Superpowers, GSD) waste tokens and a short grill-me skill, a spec split into issues, a definition of done, and a fresh-context adversarial review suffice; a minority keeps design-implement-verify. Sequential execution is cheaper than per-step subagents.
  Basis: cited (the variance and cost figures); reported (the split opinion).
  Source: external/please-use-me-often/agent-failure-dossier/00-INDEX.md:55; external/please-use-me-often/agent-failure-dossier/judged/spec.jsonl:3.

- [ ] **CTX-582** Effort in code review, measured by one poster (not agentic): 36 seeded bugs, 144 `claude -p --effort` runs. Recall 80% low, 85% medium, 86% high (noise about 4 points, so medium equals high); false alarms per review 3.4, 2.3, 1.9; output tokens Opus 5.5 1,496/2,701/3,734, Haiku 5.5 5,930/10,993/18,614; Sonnet 5.5 low false alarms 5.8 against 0.8 at high. Practice: medium by default, high when a false alarm blocks a merge. Cross-lab review did not beat same-lab (22 of 100 defects caught by the other lab).
  Basis: measured, one poster.
  Source: external/2026-11-02/reddit.com-r-claudeai-comments-1xlgzdz-high-effort-mostly-cut-false-ala-20261102T080423Z.md:39 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xlgzdz/high_effort_mostly_cut_false_alarms_in_my_claude/>).

- [ ] **CTX-583** Per-model notes (cited from Anthropic 5.5 guides plus corpus). Opus 5.5 stops prematurely in four named ways (announce next step, offer to continue, list non-blocking decisions); Sonnet 5.5 calls tools with wrong case (`bash`; 6 corpus calls, all subagent), adds unrequested tests and docs, may report done unchecked at low effort; Haiku 5.5 stops early and reports unverified at low or medium. Sonnet 5.5 batches reads into one shell command and writes whole files (fewer test runs 1.6 against 6.7, passes 25/30 to 30/30, about $0.15 against $0.36 per task; one poster, 10 tasks x 3 runs, saturated). Cost at max effort against high: Sonnet 5.5 5x, Opus 3.44x, Haiku 4.34x. Speed does not follow price (one 7-task set: Opus 5.5 about 121 s, Sonnet 5.5 about 140 s, Haiku 5.5 about 100 s). One game-dev anecdote: Opus 5.5 180k output tokens and all of the remaining 85% usage, unfinished; Sonnet 5.5 58k, about 15%, finished.
  Basis: cited (Anthropic guides); measured, one poster (the task and speed figures); reported, one user (the game-dev anecdote).
  Source: external/2026-10-21/reddit.com-r-claudecode-comments-1xak96j-i-measured-87000-of-my-claude-20261020T074808Z.md:84 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xak96j/i_measured_87000_of_my_claude_code_api_calls_two/>); external/2026-11-02/reddit.com-r-claudeai-comments-1xkhps9-opus-55s-safety-guardrails-are-b-20261101T191226Z.md:249 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xkhps9/opus_55s_safety_guardrails_are_becoming/>).

- [ ] **CTX-584** Fable 5.2 at high to xhigh and Opus 5.5 at medium to high are reported as sweet spots (Anthropic reportedly said xhigh adds little over high). Fable ties Opus on controlled runs at 1.5-3x cost. Mythos 5.2 is reported as the same model with extra safeguards. Fable draws the weekly all-models limit with no separate pool; the extra cap is about half the weekly limit on some plans; one claim that a Fable advisor draws no separate usage is unverified. Reopen rates are equal at twice the cost on 30 issues (one codebase). Fable as a Projects coordinator is wasteful (a router is Haiku-grade). `claude-fable-5-2` and `claude-mythos-5-2` are present as model IDs in 2.1.326 (chunk-5h5hxvwy.js@622, chunk-9vmv3a50.js@21145; code search). Fable 5.2 and Mythos 5.2 are reported (by the user, 2026-11-13) to be one model with different guardrails; most dossiers cover Fable 5.1; many reports say Fable falls short of standards (a claim, not checked against a dossier).
  Basis: reported (reported, user, 2026-11-13 for the one-model claim).
  Source: external/2026-11-10/reddit.com-r-claudecoding-comments-1xs84wp-tldr-fable-52-high-vs-opus-5-20261110T095106Z.md:2 (url: <https://www.reddit.com/r/ClaudeCoding/comments/1xs84wp/tldr_fable_52_high_vs_opus_55_xhigh_via/>); external/2026-11-10/reddit.com-r-claudeai-comments-1xs2wdl-fable-52-review-here-is-whats-ac-20261110T093116Z.md:41 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xs2wdl/fable_52_review_here_is_whats_actually_different/>); external/please-use-me-often/agent-failure-dossier/judged/setting.jsonl:26; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:5317, reported, user, 2026-11-13.

- [ ] **CTX-585** Community reports relayed by the user say: Haiku gets stuck on small mistakes as a coordinator and is best for cheap reviews, quick answers, and scouting; Sonnet at medium is the everyday default; Opus 5.5 at medium is the default and max effort inflates cost; Fable at max effort is discouraged.
  Basis: reported, several Discord users, relayed by the user, 2026-11-13.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:6028; reported, user, 2026-11-13.

- [ ] **CTX-586** A poster using Sonnet 5.5 on the free tier asked about papers on LLM introspection; Claude saw a cited paper on fine-tuning a model to predict its own outputs to gain introspective access (arXiv 2410.13787, <https://arxiv.org/abs/2410.13787>), asked to try an experiment, and then made up its own protocol that had nothing to do with the paper, writing predictions with confidence levels first (for example 42 at 45% for "pick a number between 1 and 100").
  Basis: reported (one poster; no run).
  Source: external/2026-10-28/reddit.com-r-claudeai-comments-1xfs68x-claude-decided-to-run-an-experim-20261028T060928Z.md:29 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xfs68x/claude_decided_to_run_an_experiment_on_itself/>).
