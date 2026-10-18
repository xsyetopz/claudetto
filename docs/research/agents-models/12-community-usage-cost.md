# Community Evidence on Usage, Cost, Caching, and Context (R12)

Scope: Reddit threads, 2026-09 to 2026-10, anecdotal or self-measured.
No thread measures Sonnet 5.5 or Haiku 5.5 subagents on a subscription plan.

## Sources

- "How prompt caching works in Claude Code (and how to stop wasting tokens)": <https://www.reddit.com/r/ClaudeAI/comments/1uih6w7/how_prompt_caching_works_in_claude_code_and_how/>
- "Two hidden settings to cut token usage": <https://www.reddit.com/r/ClaudeCode/comments/1wq7920/two_hidden_settings_to_cut_token_usage/>
- "Would I save on usage by switching to a cheaper model for context compaction than running /compact on": <https://www.reddit.com/r/ClaudeCode/comments/1w51gn6/would_i_save_on_usage_by_switching_to_a_cheaper/>
- "Theories on the increased usage consumption + tips": <https://www.reddit.com/r/ClaudeCode/comments/1wh0ez4/theories_on_the_increased_usage_consumption_tips/>
- "Opus 5.5 is the real deal: same accuracy as Fable 5.1 on my 25 graded tasks, faster, and way cheaper": <https://www.reddit.com/r/ClaudeAI/comments/1woicc1/opus_55_is_the_real_deal_same_accuracy_as_fable/>
- "Opus 5.5 at Medium is cheaper and faster than Opus4.6/Fable5.1 at high": <https://www.reddit.com/r/ClaudeCode/comments/1wocoug/opus_55_at_medium_is_cheaper_and_faster_than/>
- "Claude Code ships a per-model table of what each effort level costs": <https://www.reddit.com/r/ClaudeAI/comments/1wjr89j/claude_code_ships_a_permodel_table_of_what_each/>
- "Tired of people complaining about usage. Here's a guide to conserve usage": <https://www.reddit.com/r/ClaudeCode/comments/1wa9aya/tired_of_people_complaining_about_usage_heres_a/>
- "Opus 5.5 Context Degradation": <https://www.reddit.com/r/ClaudeAI/comments/1wobx5g/opus_55_context_degradation/>
- "If your usage runs out quickly": <https://www.reddit.com/r/ClaudeCode/comments/1wgf3sv/if_your_usage_runs_out_quickly/>
- "I exhausted my claude max 20x weekly limit. How many of you have a backup Claude subscription?": <https://www.reddit.com/r/ClaudeCode/comments/1ws56p0/i_exhausted_my_claude_max_20x_weekly_limit_how/>
- "Heavy usage use cases": <https://www.reddit.com/r/ClaudeCode/comments/1w5tjd4/heavy_usage_use_cases/>
- "TIL and potential PSA: you can lose subagent work when hitting the 5hr limit": <https://www.reddit.com/r/ClaudeAI/comments/1umuvyu/til_and_potential_psa_you_can_lose_subagent_work/>
- "What the hell is a turn limit (200-turn limit) and why are subagents suddenly hitting them?": <https://www.reddit.com/r/ClaudeCode/comments/1woaxj7/what_the_hell_is_a_turn_limit_200turn_limit_and/>
- "Six subagents on three different models in one turn. I built something to actually watch that happen": <https://www.reddit.com/r/ClaudeAI/comments/1w1njpj/six_subagents_on_three_different_models_in_one/>
- "Why token-saving plugins are costing you more money and tokens on Anthropic APIs": <https://www.reddit.com/r/LLMDevs/comments/1uzq1c4/why_tokensaving_plugins_are_costing_you_more/>
- "Anthropic shipped 4 context tools between /clear and /compact. Here's when each one wins": <https://www.reddit.com/r/ClaudeCode/comments/1tfjhgj/anthropic_shipped_4_context_tools_between_clear/>
- "Why Claude Code Max burns limits 40% faster with 20K less usable context. Proxy evidence inside": <https://www.reddit.com/r/ClaudeAI/comments/1sj8o9l/why_claude_code_max_burns_limits_40_faster_with/>

## Findings

### Cache and Model Switch

1. A cache hit bills at 10% of input price, and a change early in the prefix, such as the model, is a miss.
   A subagent has its own cache, and "Subagents always use 5m, even on a subscription."
   Source: "How prompt caching works in Claude Code".
2. A fresh `claude --print` start created 41k to 58k cache tokens, depending on the CLI version.
   Each fresh subagent start pays a similar fixed cost (an inference).
   Source: "Why Claude Code Max burns limits 40% faster with 20K less usable context" (April 2026, old CLI).
3. A switch to a cheaper model gives that model no cache hits, because it reads the whole history again.
   A commenter puts Fable/Mythos 5.1 cache reads at $0.25/M against Haiku 4.5 fresh input at $1/M, so 4x more.
   The cheaper model wins only when the cache is already expired.
   Source: "Would I save on usage by switching to a cheaper model for context compaction".
   The prices are the commenter's, and they are not verified for Haiku 5.5.
4. A fork inherits the whole transcript, so a late fork costs far more than a fresh subagent.
   Forking became the default in CLI 2.1.232, and `CLAUDE_CODE_FORK_SUBAGENT=0` turns it off.
   Source: "Theories on the increased usage consumption + tips".

### Measured Cost per Model (Self-Run Benchmark on Max, API List Prices as an Estimate)

1. On 23 graded tasks, the cost per passed task was Opus 5.5 $0.09, Sonnet 5 $0.11, Opus 5 $0.19, Fable/Mythos 5.1 $0.26.
   Haiku 4.5 was $0.10 with a 76% pass rate, mostly failing the hardest tier.
   Source: "Opus 5.5 is the real deal".
2. Sonnet 5 was cheaper than Opus 5.5 on easy tasks ($0.014 vs $0.025) and hard tasks ($0.037 vs $0.045).
   It was dearer on frontier tasks ($0.24 vs $0.19) and about 3x slower (137s vs 49s).
   Source: "Opus 5.5 is the real deal".
3. Low effort on Opus 5.5 was about 20% cheaper and 30% faster than high with no accuracy loss.
   Source: "Opus 5.5 is the real deal".
4. One poster ran Opus 5.5 at medium as an overnight orchestrator for 2% of usage, where older models took 25%.
   High and xhigh "start to guzzle tokens".
   Source: "Opus 5.5 at Medium is cheaper and faster than Opus4.6/Fable5.1 at high".
5. The effort cost index (high = 1) differs by model.
   For `sonnet-5` it is low 0.47, medium 0.74, xhigh 2.41, max 5.59.
   For `opus-5` it is low 0.67, medium 0.76, xhigh 1.60, max 1.70.
   Source: "Claude Code ships a per-model table of what each effort level costs".
   The table is relative inside one model and has no 5.5 data.

### Subscription Limits and Lost Work

 1. Fable/Mythos 5.1 drains limits fastest, and users hit the weekly Fable/Mythos limit on the $200 plan.
    Source: "Heavy usage use cases".
 2. One Max 20x user delegates coding to Sonnet 5, which "usually has practically unlimited usage" on that plan.
    Source: "Tired of people complaining about usage".
    The same user advises against Haiku "unless it's something even a beginner could do".
 3. The weekly limit of a 20x plan is only about 1.7x that of a 5x plan.
    Source: "I exhausted my claude max 20x weekly limit".
 4. A 5-hour limit hit during a subagent run loses the subagent work, and a restart redoes it.
    The poster moved Fable/Mythos subagents down to Opus.
    Source: "TIL and potential PSA: you can lose subagent work when hitting the 5hr limit".
 5. A user hit the 200 tool-call stop on Opus 5.5 subagents and calls the limit "completely pointless".
    Source: "What the hell is a turn limit (200-turn limit)".
 6. A commenter warns that a cheaper subagent may falsify its report, and the parent log keeps only the result.
    Source: "Six subagents on three different models in one turn".

### Context Quality

 1. For Opus 5.5, one poster saw no loss at about 500k tokens and visible loss past about 700k.
    Opus 5 degraded at about 300k.
    A reply reports skipped instructions and forgotten decisions in a long session.
    Source: "Opus 5.5 Context Degradation".
 2. Other posters report quality loss at about 150k to 200k tokens.
    They advise `/compact` at 50 to 60% of the window.
    Sources: "If your usage runs out quickly" and "Tired of people complaining about usage".
 3. A subagent starts with a clean window, so the 700k point rarely applies to it.
    A long loop with large tool output can still reach 150k (an inference).

## Implications for the `claudetto` Agents

- `planner` and `reviewer` (Opus 5.5 high): finding 5 shows Opus 5.5 is the cheapest per passed task.
  Findings 7 and 8 say `medium` may keep accuracy, so test `medium` for `reviewer` before keeping `high`.
- `implementer` (Sonnet 5.5 medium): finding 6 shows Sonnet is cheapest on easy and hard tasks.
  Keep it for scoped slices with a known check, and do not raise it to `xhigh` (finding 9, 2.41x).
- `debugger` (Sonnet 5.5 high): an unknown cause is the frontier case of finding 6.
  Sonnet may cost more and run 3x slower than Opus 5.5 there.
  Compare it with Opus 5.5 medium on real bugs.
- `researcher` and `investigator`: long reads fill context (finding 17), so keep them as separate workers.
  Haiku was not cheaper per passed task (finding 5) and may falsify reports (finding 15).
  Keep Haiku 5.5 for narrow, checkable reads, and require sources in the output.
- A cheaper worker model does not save limits through the cache (findings 1 to 3).
  Savings come from a lower price per token and a short run, not from cache reuse.
- No Fable/Mythos subagent: findings 10 and 13 show Fable/Mythos burns the weekly limit and loses work at a limit stop.
- `maxTurns`: finding 14 shows a hard stop frustrates users, and finding 13 shows a stopped worker loses its work.
  A bound still limits a loop with large tool output (finding 18).
  Prefer a high bound as a safety net, and have the worker return partial results before the bound.
- Keep each agent a fresh, lean worker, because a fork costs more (finding 4).
- No agent orchestrates, so finding 11 is a warning only, as the root agent is the expensive thinker.
  Few parallel workers lose less work at a limit stop (finding 13).

## Open Questions

- No thread measures Sonnet 5.5, Haiku 5.5, or Opus 5.5 subagents on a subscription plan.
  Run `claudetto-sessions:usage` on real sessions to get the usage percent per task.
- Do subscription subagents use a 5-minute or 1-hour cache?
  "Two hidden settings to cut token usage" and "If your usage runs out quickly" disagree.
- Does `subagentPromptCacheTtl` pay off for a long worker run?
  One commenter calls the 2x write cost bad advice.
- What does the 5.5 effort cost index look like?
- At what turn count does a worker reach 150k context?
- The September limit changes make older cost numbers unreliable.
