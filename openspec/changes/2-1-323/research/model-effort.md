# Model and Effort per Role

Read on 2026-11-13. Tags:

- O: official Anthropic page.
- M: a user's measured run on real tasks.
- B: a third-party benchmark relay.
- A: an anecdote.

Real-world runs (M) outrank benchmarks (B), at the person's word ("benchmarks != varied real-world uses"). The O figures are Anthropic-internal benchmarks, which the page calls "directional, not guarantees".

Sources:

- O1: `platform.claude.com/docs/en/build-with-claude/effort`
- O2: `platform.claude.com/docs/en/about-claude/models/optimizing-for-cost-and-intelligence`, first 100k of 216k chars
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
