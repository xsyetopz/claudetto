# Usage Evidence

This page gives the facts about the plans, the prices, the models, and the usage of claudetto 0.1.0.
It also gives the measurements of one heavy week of dotclaude 0.x and what they mean.
Read it to learn what drives the usage, and which values are measured.
The source of each number is named in its row or line.
Source labels are official, binary, measured, reported, and inference.

## Summary

- One Max 20x week reached 100% of the weekly limit at $1,854 (measured, see [the measured week](#the-measured-week)).
- Three things drive the usage: the context per turn, the subagent fan-out, and the `general-purpose` agent.
  The model choice is not one of them.
- Turns set the cost, not tool calls.
- claudetto 0.1.0 does not detect the plan for its policy.
  Setup picks an effort and a subagent cap from the account tier only.
- claudetto 0.1.0 does not use `opusplan`.

## Models and Efforts of 0.1.0

Each agent sets its model and effort in its frontmatter.
The source is `src/plugins/claudetto/slices/agents/agents/*.md`.
The basis of the values is the big sweep (D7), as [Agents](Agents) and [Decisions Router](Decisions-Router) tell.

| Agent | Model | Effort |
| --- | --- | --- |
| `debugger` | `claude-opus-5-5` | `high` |
| `reviewer` | `claude-opus-5-5` | `high` |
| `planner` | `claude-haiku-5-5` | `xhigh` |
| `researcher` | `claude-haiku-5-5` | `xhigh` |
| `implementer` | `claude-haiku-5-5` | `xhigh` |
| `investigator` | `claude-haiku-5-5` | `xhigh` |

The settings snippet sets these values ([Settings Snippet](Settings-Snippet)).

- `model` is `claude-opus-5-5`.
- `CLAUDE_CODE_SUBAGENT_MODEL` is `claude-sonnet-5-5`.
  An agent file that names its own model overrides it.
  Each agent file names its model, so no agent uses it.
- `promptCacheTtl` is `5m`.
  The snippet sets no `effortLevel`, no `maxEffortLevel`, and no `subagentPromptCacheTtl`.
  It also sets no `advisorModel`.
- `availableModels` lists `claude-opus-5-5`, `claude-sonnet-5-5`, `claude-haiku-5-5`, and `claude-fable-5-1`.
- The variable `CLAUDE_CODE_EFFORT_LEVEL` overrides the `effort` of the agent files.
  The `setup` slice reports it when it is set.
  Its name is in `src/plugins/claudetto/slices/setup/domain/facts.ts`.

## Account Tiers and Setup Picks

Setup reads `claude auth status --json` and the rate limit tier.
It then writes an effort and a subagent cap for each account.
The source is `src/plugins/claudetto/slices/setup/domain/tiers.ts`.

| Account | `effortLevel` | `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` |
| --- | --- | --- |
| Pro | `high` | `SUBAGENTS_PRO` |
| Max 5x | `xhigh` | `SUBAGENTS_MAX_5X` |
| Max 20x | `xhigh` | `SUBAGENTS_MAX_20X` |
| API key | `high` | `SUBAGENTS_PRO` |

The subagent caps are in `src/plugins/claudetto/slices/setup/limits.ts`.
The values are 2 for Pro and an API key, 4 for Max 5x, and 7 for Max 20x.
Setup does not set the plan mode agents or the usage warnings.
Claude Code scales them by tier.
The account with no login gets no pick.

## Prices

The API list prices are per million tokens.
They were checked on 2026-10-13 (official).
Source: `https://platform.claude.com/docs/en/about-claude/pricing`.

| Model | Base input | 5-minute cache write | Cache read | Output |
| --- | --- | --- | --- | --- |
| Fable 5.1 | $10 | $12.50 | $0.25 | $50 |
| Opus 5.5 | $4 | $5 | $0.20 | $20 |
| Sonnet 5.5 | $2 | $2.50 | $0.10 | $10 |
| Haiku 5.5 (prompts up to 100,000 tokens) | $0.10 | $0.125 | $0.01 | $0.50 |
| Haiku 5.5 (prompts over 100,000 tokens) | $0.50 | $0.625 | $0.05 | $2.50 |

- The Haiku 5.5 price rises above 100,000 prompt tokens.
  Four of the six agents of 0.1.0 run on Haiku 5.5, so a long task of them can reach the higher price.
  The long-prompt price is derived from the table, and claudetto has no rule that moves a task to another model.
- The Sonnet 5.5 cache read is $0.10 per million tokens on this page.
  An older text of this wiki gave $0.20.
  That value is stale.
- Anthropic publishes no subscription multiplier.

## Fable Limit

Fable draws from the regular weekly limit.
It is not an extra pool.
These facts are from the Anthropic help pages, as the old text of this page cited them.
They are not checked again in this run.

- On Max and on Team or Enterprise premium seats, Fable can use up to 50% of the weekly limit.
- On Pro and on standard Team or Enterprise seats, Fable runs on usage credits.
- The binary labels the `seven_day_overage_included` limit as the Fable limit (binary).

A Fable weekly figure of 0% does not give free headroom.
Each model has at most the remaining share of the weekly limit.

## Cache Facts

- An effort change keeps the prompt cache.
  A model change rebuilds the prompt cache, because the cache is kept for each model.
  This is official, from the prompt caching page.
- The cache of the main conversation lives 1 hour on a subscription within its limits.
  It lives 5 minutes on usage credits or an API key.
  Subagents use 5 minutes (official, as the old text of this page cited it, not checked again in this run).
- A prompt after the TTL, and a `/compact` after it, write the whole context again.
  claudetto 0.1.0 sets `promptCacheTtl` to `5m`.
- From Claude Code `2.1.287`, the `SessionStart` input for `resume` and `fork` has `prompt_cache_likely_expired` (binary, not checked again in this run).

## Effort

- Claude Code defaults Opus 5.5 and Sonnet 5.5 to `medium` (official, not checked again in this run).
- claudetto does not set a top-level `effortLevel` in the snippet.
  The setup picks of the account tiers set it, as shown above.
- No hook event fires on an effort change (binary).

## Opusplan

claudetto 0.1.0 does not use `opusplan`.
Nothing in `src/` names it.
`opusplan` switches the model when plan mode starts and ends.
A model switch loses the prompt cache (official).

## The Measured Week

One Max 20x week (2026-09-21 to 09-28) reached 100% of the weekly limit.
The figures come from a scan of the local transcripts (measured).
The repository does not hold that scan.
The transcripts start on 09-25, so the figures are a lower bound.

The week ran under a dotclaude 0.x config, not under dotclaude 1.0.0 or claudetto 0.1.0.
Most of the week ran before 0.5.0 moved `implementer` to Sonnet 5, so the `implementer` row ran mostly on Opus 5.5.
The source is the 0.26 text of this page, in git commit `af3071f4` (`wiki/Usage-Evidence.md`, line 22).
The figures show the 0.x config, and they do not describe the agents of the table above.

| Measure | Value |
| --- | --- |
| Total | $1,854 (Opus 5.5 98.7%) |
| Cost parts | cache reads 64.7%, cache writes 28.1%, output 7.2% |
| Main conversation | 44.9%, context p50 369k, p90 807k tokens |
| `implementer` | 30.7%, 155 runs, median 68 calls |
| `general-purpose` | 17.6%, 87 runs, median 51 calls |
| Calls with context over 150k | 74.7% of cost |
| Subagent cache writes (5-minute TTL) | 71M tokens, about $355 |
| First cache write of a fresh subagent | p50 13.9k, p90 24.8k tokens |
| Main turns that background agents started | 501 of 861, about $385 |

Three things drive the usage.

1. **Context per turn.**
   Each turn reads the whole context again.
2. **Subagent fan-out.**
   Each fresh subagent writes about 14k tokens to the cache before its first tool call.
   Its 5-minute cache expires while it waits on long builds.
3. **`general-purpose` in place of the claudetto agents.**
   The settings snippet denies `Agent(general-purpose)` ([Settings Snippet](Settings-Snippet)).
   The denial is a setting.
   It is not a proof that the habit stopped.

## The Delegation Share

`just usage` runs `plugins/claudetto-sessions/bin/claudetto-usage`.
It is the `usage` skill of the `claudetto-sessions` add-on ([Sessions](Sessions)).
It repeats the scan on any machine.
It reports the sessions by entrypoint, the skill calls, the delegation share, and the latest subagent runs.

- measured, 2026-10-03, 7 days: 976 subagent runs in 25,578 main turns, which is 3.8 per 100 turns.
- measured, 2026-10-03: tool-result tokens per main session, median 19,169, p90 167,675 (253 sessions).

## Turns, Not Tool Calls

Each model turn reads the context again.
So the number of turns sets the cost.

- Independent tool calls in one response take one turn.
  The same calls in sequence take one turn each.
- Claude Code has no general tool that runs several tools in one call (binary).

## Community Claims

- True: `/compact` reads the whole conversation to write its summary.
  On a large context it is an expensive request (official).
  `/clear` costs nothing.
- True: `MEMORY.md` loads at every start, up to its first 200 lines or 25 KB (official).
  Topic files in the memory folder do not load at start.
- True: a short `CLAUDE.md` saves usage.
  It loads at every start, and in every subagent that does not set `omitClaudeMd`.
- True: subagents keep large reads out of the main context.
- False: old `.jsonl` transcripts in `~/.claude/projects/` do not go into the context.
  Only `/resume` loads one.
  The settings snippet does not set `cleanupPeriodDays`.
  See [settings snippet keys](Settings-Snippet-Keys).

## Tools That claudetto Does Not Use

| Tool | Reason |
| --- | --- |
| RTK | A JetBrains measurement of 7.6% more cost (reported). |
| Graphify | It fails on large repositories (reported). |
| grepai | It needs embeddings from Ollama or OpenAI, and it has no measurement. |

## Measuring a Session

`just measure` runs `tools/measure.ts`.
It calls `claudetto-start` of the `claudetto-sessions` add-on with the start bounds of `tools/limits.ts`.
`just start-run` captures and measures a clean sandbox session in one command.
The bounds are in [Bounds](Bounds).

## Related Pages

- [Plugin Layout](Plugin-Layout)
- [Sessions](Sessions)
- [Bounds](Bounds)
- [Decisions Router](Decisions-Router)
- [Agents](Agents)
- [Settings Snippet](Settings-Snippet)
- [Evidence](Evidence)
- [Handoff Cost](Handoff-Cost)
- [Evals](Evals)
