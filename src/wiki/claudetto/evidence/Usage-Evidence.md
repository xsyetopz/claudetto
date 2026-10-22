# Usage Evidence

This page gives the prices, models, and usage facts that `claudetto` relies on.
Each fact has a source label: official, binary, measured, reported, or inference.

## Prices

API list prices per million tokens, checked on 2026-10-13 (official, `https://platform.claude.com/docs/en/about-claude/pricing`).

| Model | Base input | 5-minute cache write | Cache read | Output |
| --- | --- | --- | --- | --- |
| Fable 5.1 | $10 | $12.50 | $0.25 | $50 |
| Opus 5.5 | $4 | $5 | $0.20 | $20 |
| Sonnet 5.5 | $2 | $2.50 | $0.10 | $10 |
| Haiku 5.5 (prompts up to 100,000 tokens) | $0.10 | $0.125 | $0.01 | $0.50 |
| Haiku 5.5 (prompts over 100,000 tokens) | $0.50 | $0.625 | $0.05 | $2.50 |

- A long task on Haiku 5.5 can reach the higher price.
  `claudetto` has no rule that moves a task to another model.
- Anthropic publishes no subscription multiplier.

## Fable Limit

Fable draws from the regular weekly limit, not from an extra pool.
These facts come from the Anthropic help pages and are not checked again.

- On Max and on premium Team or Enterprise seats, Fable can use up to 50% of the weekly limit.
- On Pro and standard Team or Enterprise seats, Fable runs on usage credits.
- The binary labels `seven_day_overage_included` as the Fable limit.
- A Fable figure of 0% gives no free headroom.

## Cache and Effort

| Fact | Source |
| --- | --- |
| An effort change keeps the prompt cache | official |
| A model change rebuilds the prompt cache, because the cache is per model | official |
| The main conversation cache lives 1 hour on a subscription and 5 minutes on credits or an API key | official, not checked again |
| Subagents use 5 minutes | official, not checked again |
| A prompt or `/compact` after the TTL writes the whole context again | official |
| From `2.1.287`, the `SessionStart` input for `resume` and `fork` has `prompt_cache_likely_expired` | binary, not checked again |
| Claude Code defaults Opus 5.5 and Sonnet 5.5 to `medium` effort | official, not checked again |
| No hook event fires on an effort change | binary |

A plugin that switches the model at plan mode, as `opusplan` does, pays a cache write at each switch.

## Model Aliases

- `haiku` resolves to Haiku 5.5 on the Anthropic API and to Haiku 4.5 on Bedrock, Vertex, and Foundry (documents only).
- A full model ID such as `claude-haiku-5-5` works in the `agent.spawn` hook.
- `maxEffortLevel: max` causes no clamp.
  An effort of `max` set by a hook arrives as `xhigh`, probably due to an account limit for each model (unverified).

## The Measured Week

One Max 20x week reached 100% of the weekly limit at $1,854 (measured).
The model choice is not one of the three drivers of usage.

**Method:** A scan of local transcripts for one Max 20x week (2026-09-21 to 09-28).
The transcripts start on 09-25, so the figures are a lower bound.
The week ran under the config of an earlier release (0.x).
Most of it ran before `implementer` moved to Sonnet 5, so that row ran mostly on Opus 5.5.
The scan is not in the repository.
The source is git commit `af3071f4` (`wiki/Usage-Evidence.md`, line 22).

| Measure | Value |
| --- | --- |
| Total | $1,854 (Opus 5.5 98.7%) |
| Cost parts | cache reads 64.7%, cache writes 28.1%, output 7.2% |
| Main conversation | 44.9%, context p50 369k, p90 807k tokens |
| `implementer` (custom agent of that release) | 30.7%, 155 runs, median 68 calls |
| `general-purpose` | 17.6%, 87 runs, median 51 calls |
| Calls with context over 150k | 74.7% of cost |
| Subagent cache writes (5-minute TTL) | 71M tokens, about $355 |
| First cache write of a fresh subagent | p50 13.9k, p90 24.8k tokens |
| Main turns that background agents started | 501 of 861, about $385 |

**Result:** Three things drive usage.

1. Context per turn, because each turn reads the whole context again.
2. Subagent fan-out.
   A fresh subagent writes about 14k tokens to the cache before its first tool call, and its 5-minute cache expires during long builds.
3. `general-purpose` instead of a purpose-made agent.
   The snippet denies `Agent(general-purpose)` ([Settings Snippet](Settings-Snippet)), which is a setting and not proof that the habit stopped.

## Delegation Share

The `usage` report of 0.1.0 scanned local transcripts, and it is not in 0.2.0.

| Measure | Value | Date |
| --- | --- | --- |
| Subagent runs in 7 days | 976 in 25,578 main turns (3.8 per 100) | 2026-10-03, measured |
| Tool-result tokens per main session | median 19,169, p90 167,675 (253 sessions) | 2026-10-03, measured |

## Turns, Not Tool Calls

- Each model turn reads the context again, so the number of turns sets the cost.
- Independent tool calls in one response take one turn, and the same calls in sequence take one turn each.
- Claude Code has no general tool that runs several tools in one call (binary).

## Guard Denies of Read-Only Commands

The guard must deny only a command that discards work.
**Method:**

1. A read-only script read each `.jsonl` transcript under `~/.claude/projects/` of each project except `claudetto`.
2. It matched each `tool_result` of a `Bash` call with the deny text of the guard to the command of its `tool_use`.
3. Each command that changes no project file became a must-pass case in the guard lab, with the project folder replaced by `/p`.

**Result (measured, 2026-10-17):**

- 11 guard denies in 511 transcripts of 6 projects.
- 10 of the 11 were read-only commands: prints, searches, and check scripts that held destructive commands only as string data.
  All 10 came from an earlier checkout of this project, where the work tested the guard itself.
  The guard of this release allows each of them, so earlier builds gave these denies (inference).
- The other deny, a `git rm -qf` in an unrelated project, discards work, so it was right.
- The unrelated projects had 0 false denies.
  The sample is small, and most denies come from the work on the guard, so it does not show the false-positive rate of normal use.
- A read-only command with `$(( ))` was denied before.
  The shell scan of this release reads `$(( ))` as arithmetic, so it passes.

## Related Pages

- [Usage Evidence (Part 2)](Usage-Evidence-2)
- [Settings Snippet](Settings-Snippet)
- [Handoff Cost](Handoff-Cost)
- [Evals](Evals)
- [Evidence](Evidence)
