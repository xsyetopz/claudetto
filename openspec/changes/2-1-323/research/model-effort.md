# Model and Effort per Role

Read on 2026-11-13. Tags:

- O: official Anthropic page.
- M: a user's measured run on real tasks.
- B: a third-party benchmark relay.
- A: an anecdote.

Real-world runs (M) outrank benchmarks (B), at the person's word ("benchmarks != varied real-world uses"). The O figures are Anthropic-internal benchmarks, which the page calls "directional, not guarantees".

Sources:

- O1: `platform.claude.com/docs/en/build-with-claude/effort`
- O2: `platform.claude.com/docs/en/about-claude/models/optimizing-for-cost-and-intelligence`, all 216k chars, through `clawdipedia-docs`. "ref N" names the page's benchmark reference N.
- O3: `claude.dev/blog/which-claude-model-should-you-build-with/`
- O4: `claude.com/resources/articles/claude-model-and-effort-level-in-claude-code`
- M1: `external/2026-10-14/export-I tested Haiku 5.5, Sonnet 5.5 and Opus 5.5 as subagents on 6 real tasks.jsonl`, by emarkosov
- M2: `griffinwooldridge.com/blog/claude-haiku-5-5-vs-sonnet-vs-opus`, 1 to 3 runs per test

## Per Model

| Model | Use | Avoid | Evidence |
|---|---|---|---|
| Haiku 5.5 | `high` for file search; `medium` for routing and extraction | `low` in long agent prompts; `xhigh` for search; any level for fact-checking or review | M1: at `high`, code search found 44 of 48 files, against Opus 45, for $0.44 against $6.17. At `xhigh`, the same 44 files cost 3x as much ($1.39 against $0.47). Haiku at `high` flagged 30 correct sentences as errors (Opus: 0); at `xhigh` it flagged 28 (Opus: 3). At `xhigh`, research came near Opus, at half the price and twice the time. O1: at `low`, Haiku is "more likely to skip a search, stop early, or skip a check" in long agent prompts. |
| Sonnet 5.5 | `medium` for well-specified agentic work; `high` for harder or longer work | `xhigh`/`max` unless an eval shows a gain | O1, O3. O2: `medium` scored about 7 points below `high` on SWE-bench Pro at 59% of the cost, and 62.7% against 77.8% on Anthropic's internal agentic-coding benchmark. |
| Opus 5.5 | `medium` (default); `high` for hard work | `xhigh` (O3: +1.4 points for 2.5x the cost of `high`); `max`; `low` for defect search (O2: 34 points lower) | O2: SWE-bench Pro subset scores: `low` 87.4%/$0.11, `medium` 92.8%/$0.21, `high` 95.3%/$0.29, `xhigh` 96.7%/$0.74. O3: "before you raise Opus 5.5 past `high` on a hard task, test Fable 5.2." |
| Fable 5.2 / Mythos 5.2 | `high` (default, O1) as an opt-in advisor | `max` (O1: "rare task where time and tokens don't matter"); `medium` for research (O2: no better than `low`) | O2: Opus `high` with a Fable 5.1 advisor scored +1.7 points for 2.1x the cost, at the edge of noise. An executor that rarely consults gains nothing, and Opus `low` with an advisor scored 7 points lower than alone. Fable as an orchestrator cost 19% more than Opus for about the same score. |

## Multi-Agent Routing

- **Opus orchestrator with Sonnet subagents (O2):** on work larger than one context, about a third cheaper than one Opus session, at about the same score.
- **Haiku subagents for coding under Opus `medium` (O2):** 32% cheaper, with a pass rate about 4 points lower. That is about what a lower effort without subagents gives.
- **Model choice (O3):** "Keep small models on work where a mistake is cheap to spot, like finding files, running tests and reading logs. Keep code edits and judgment calls on the main model."
- **Effort escalation (O2):** run at `low` or `medium` and re-run failures at `high`. On Opus this solved about 97% of tasks for $0.17 to $0.24, against 95.3% for $0.29 with every task at `high`. It needs a checker that fails bad work.
- **Haiku's 100k line (O2):** "Past that, every token of the request costs 5 times as much, output included. Cache reads and writes count toward the 100,000."
- **Haiku past 100k in practice (O2 ref 25):** on 79 Managed Agents tasks, about 5% of Haiku's requests ran over 100k tokens and carried 73% of its cost.
- **Compaction overshoots its trigger (O2 ref 18):** on Haiku, API compaction ran at the first request that reached the trigger, and its summary prompt ran up to 7,269 tokens past it: a 90k trigger gave a largest prompt of 97,269. One session cost $0.272 at the 150k default trigger, $0.082 at 90k, $0.075 at 50k, and $0.729 with no compaction. This is the API's compaction, not Claude Code's `autoCompactWindow`, so task 2.6 still has to measure the Claude Code side.
- **Defect search, larger than one context (O2 ref 8), mean F1 and cost per run:**

  | Configuration | F1 | Cost |
  |---|---|---|
  | Haiku alone (`medium`) | 0.577 | $25 |
  | Opus `high` with Haiku subagents | 0.677 | $47 |
  | Sonnet alone (`high`) | 0.760 | $103 |
  | Opus `high` with Sonnet subagents | 0.831 | $139 |
  | Opus alone `medium` / `high` | 0.827 / 0.850 | $200 / $236 |
  | Fable 5.2 alone `low` / `high` | 0.866 / 0.909 | $357 / $563 |

  Haiku subagents lost 15 points of F1 against Sonnet subagents on judgment work. That backs Sonnet for `sweep`, and Haiku for file finding only.
- **Coding with Haiku subagents (O2 ref 29):** Opus `medium` with Haiku `medium` subagents passed 68.8% at $3.35, against Opus alone 72.1% at $4.78 and Opus `low` 63.0% at $1.84. The page puts the subagent result on the straight line between `low` and `medium`: no gain over lowering effort.
- **Sonnet `medium` against `high` on coding (O2 ref 11):** 62.7% at $0.16 against 77.8% at $0.33, 15 points lower for 48% of the cost. Opus on the same set: `low` 74.8%/$0.35, `medium` 86.6%/$0.84, `high` 88.4%/$1.38, `xhigh` 91.1%/$4.11. Fable 5.2: `low` 88.9%/$1.05, `high` 93.5%/$5.39. So `work` at Sonnet `medium` needs the re-run at `high` on a failed check.
- **Escalation figures (O2 ref 3):** Opus `low` then `high` on failures solved 96.4% to 97.5% for about $0.17; `medium` first, 96.0% to 97.1% for $0.24; all at `high`, 94.8% to 95.8% for $0.29. The lever table puts the saving at about 40% against running everything at `high`.
- **Advisor needs a reason to fire (O2 refs 3, 9, 13):** Sonnet 5.5 at `high` consulted an Opus advisor on 0 of 20 SWE-bench Pro problems, with or without the suggested prompt; at `xhigh`, on 3 and 4 of 20. On GPQA, with the tool added and no prompt asking for consults, neither Haiku nor Sonnet called it once. Opus `low` consulted on 1 of 300 charts. An opt-in advisor therefore needs a body line that says when to consult.
- **Fable 5.2 on research (O2 ref 7):** on DeepResearch Bench II, Fable 5.2 `high` scored 1.9 points below Opus `medium` (0.9 in a later run), and 4.7 below Fable 5.1 `high`, at $4.82 against Opus $1.69 per task. Its `medium` beat `low` by 0.6 points, inside noise.
- **Output cap (O2 ref 12):** raising `max_tokens` to 64,000 did not raise cost per solved task; Opus solved 57.6% at 16,384 and 75.6% at 64,000.
- **Effort change and the cache (O2 ref 18):** a top-level effort change mid-conversation re-wrote 81k of a 101k cached prompt; a per-message effort change re-wrote nothing. Inferred, not run: a subagent starts its own conversation, so the Agent tool's `effort` parameter should break no cache of the main loop.

## Pasted Claims Checked

| Claim | Verdict |
|---|---|
| Opus 5.5 at `xhigh` solves "96.5% of the same complex tasks" as Fable 5.2 at `high`, for $0.75 against $1.39 | Misread. O2: Opus at `xhigh` solved 96.5% of a SWE-bench Pro subset and Fable at `high` 96.3%, at $0.75 against $1.39 per solved task. Opus at `high` solved 95.5% for $0.30. |
| Fable at `low` is "easily outperformed" by Opus 5.5 | Mixed. O2, SWE-bench Pro: Fable `low` 94.6% at $0.39, against Opus `high` 95.5% at $0.30. B (AA index, relayed by blogs): Fable `low` 54 at $3.10 beats Opus `high` 52 at $3.46. |
| `max` is not worth it for daily work | Backed by O1, O2, and O3. |
| Haiku matches Opus on a unit fix for 1.3 cents against 43 cents | True for one one-sentence bug fix at default effort, 3 runs (M2). The "Opus team" figure is a different test: Haiku alone $0.14 and Opus with nine Haiku readers $0.85, both at a 95% props match. |
| Thinking cannot be turned off on Sonnet or Haiku 5.5 | False for Haiku: O1 allows `disabled` at `high` and below. For Sonnet, O1 says to send `between_tools`, "not `disabled`"; the 400 error for `disabled` on Sonnet is unchecked. |
| "Haiku is good only for cheap reviews" (A) | Contradicted by M1: Haiku flagged 30 correct sentences as errors. |
| "Sonnet default, Opus deep thinker, Haiku scouting" (A) | Matches O3 and M1. |
