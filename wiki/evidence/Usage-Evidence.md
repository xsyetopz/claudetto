# Usage evidence

This page gives the facts about the plans, the prices, the models, and the usage of dotclaude 1.0.0.
It also gives the measurements of one heavy week and what they mean.
The source of each number is named in its row or line.
Source labels are official, binary, measured, reported, and inference.

## Summary

- One Max 20x week reached 100% of the weekly limit at $1,854 (measured, see [The measured week](#the-measured-week)).
- Three things drive the usage: the context per turn, the subagent fan-out, and the `general-purpose` agent.
  The model choice is not one of them.
- Turns set the cost, not tool calls.
- dotclaude 1.0.0 does not detect the plan for its policy.
  Setup picks an effort and a subagent cap from the account tier only.
- dotclaude 1.0.0 does not use `opusplan`.

## Models and efforts of 1.0.0

Each agent sets its model and effort in its frontmatter.
The source is `src/plugins/dotclaude/slices/agents/agents/*.md`.

| Agent | Model | Effort |
| --- | --- | --- |
| `planner` | `claude-opus-5-5` | `high` |
| `reviewer` | `claude-opus-5-5` | `high` |
| `debugger` | `claude-sonnet-5-5` | `high` |
| `researcher` | `claude-sonnet-5-5` | `medium` |
| `implementer` | `claude-sonnet-5-5` | `medium` |
| `investigator` | `claude-haiku-5-5` | `medium` |

The settings snippet sets these values, from `src/plugins/dotclaude/slices/prompt/slice.ts`.

- `model` is `claude-opus-5-5`.
- `CLAUDE_CODE_SUBAGENT_MODEL` is `claude-sonnet-5-5`.
  An agent file that names its own model overrides it.
- `maxEffortLevel` is `max`.
  The snippet sets no `effortLevel`.
- `promptCacheTtl` is `5m`.
  The snippet sets no `subagentPromptCacheTtl`, and it sets no `advisorModel`.
- `availableModels` lists `claude-opus-5-5`, `claude-sonnet-5-5`, `claude-haiku-5-5`, and `claude-fable-5-1`.
- The variable `CLAUDE_CODE_EFFORT_LEVEL` overrides the `effort` of the agent files.
  Its name is in `src/plugins/dotclaude/slices/setup/domain/facts.ts`.

## Account tiers and setup picks

Setup reads `claude auth status --json` and the rate limit tier.
It then writes an effort and a subagent cap for each account.
The source is `src/plugins/dotclaude/slices/setup/domain/tiers.ts`.

| Account | `effortLevel` | `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` |
| --- | --- | --- |
| Pro | `high` | `SUBAGENTS_PRO` |
| Max 5x | `xhigh` | `SUBAGENTS_MAX_5X` |
| Max 20x | `xhigh` | `SUBAGENTS_MAX_20X` |
| API key | `high` | `SUBAGENTS_PRO` |

The subagent caps are in `src/plugins/dotclaude/slices/setup/limits.ts`.
Setup does not set the plan mode agents or the usage warnings, because Claude Code scales them by tier.
The account with no login gets no pick.

## Prices

API list prices per million tokens, checked on 2026-10-13 (official).
Source: `https://platform.claude.com/docs/en/about-claude/pricing`.

| Model | Base input | 5-minute cache write | Cache read | Output |
| --- | --- | --- | --- | --- |
| Fable 5.1 | $10 | $12.50 | $0.25 | $50 |
| Opus 5.5 | $4 | $5 | $0.20 | $20 |
| Sonnet 5.5 | $2 | $2.50 | $0.10 | $10 |
| Haiku 5.5 (prompts up to 100,000 tokens) | $0.10 | $0.125 | $0.01 | $0.50 |
| Haiku 5.5 (prompts over 100,000 tokens) | $0.50 | $0.625 | $0.05 | $2.50 |

- The Haiku 5.5 price rises above 100,000 prompt tokens.
  The investigator agent is the only Haiku 5.5 agent of 1.0.0.
- The Sonnet 5.5 cache read is $0.10 per million tokens on this page.
  An older text of this wiki gave $0.20, and that value is stale.
- Anthropic publishes no subscription multiplier.

## Fable limit

Fable draws from the regular weekly limit, and it is not an extra pool.
These facts are from the Anthropic help pages, as the old text of this page cited them.
They are not checked again in this run.

- On Max and on Team or Enterprise premium seats, Fable can use up to 50% of the weekly limit.
- On Pro and on standard Team or Enterprise seats, Fable runs on usage credits.
- The binary labels the `seven_day_overage_included` limit as the Fable limit (binary).

A Fable weekly figure of 0% does not give free headroom.
Each model has at most the remaining share of the weekly limit.

## Cache facts

- An effort change keeps the prompt cache.
  A model change rebuilds the prompt cache, because the cache is kept for each model.
  This is official, from the prompt caching page.
- The cache of the main conversation lives 1 hour on a subscription within its limits.
  It lives 5 minutes on usage credits or an API key.
  Subagents use 5 minutes (official, as the old text of this page cited it, not checked again in this run).
- A prompt after the TTL, and a `/compact` after it, write the whole context again.
  dotclaude 1.0.0 sets `promptCacheTtl` to `5m`.
- From Claude Code `2.1.287`, the `SessionStart` input for `resume` and `fork` has `prompt_cache_likely_expired` (binary, not checked again in this run).

## Effort

- Claude Code defaults Opus 5.5 and Sonnet 5.5 to `medium` (official, not checked again in this run).
- dotclaude does not set a top-level `effortLevel` in the snippet.
  The setup picks of the account tiers set it, as shown above.
- No hook event fires on an effort change (binary).

## Opusplan

dotclaude 1.0.0 does not use `opusplan`.
Nothing in `src/` names it.
`opusplan` switches the model when plan mode starts and ends, and a model switch loses the prompt cache (official).

## The measured week

One Max 20x week (2026-09-21 to 09-28) reached 100% of the weekly limit.
The figures come from a scan of the local transcripts (measured).
The repository does not hold that scan.
The transcripts start on 09-25, so the figures are a lower bound.

The week ran under a 0.x config, not under 1.0.0.
Most of the week ran before 0.5.0 moved `implementer` to Sonnet 5, so the `implementer` row
ran mostly on Opus 5.5.
The source is the 0.26 text of this page, in git commit `af3071f4` (`wiki/Usage-Evidence.md`,
line 22).
The figures show the 0.x config, and they do not describe the 1.0.0 agents of the table above.

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
3. **`general-purpose` in place of dotclaude agents.**
   The settings snippet denies `Agent(general-purpose)` in `src/plugins/dotclaude/slices/prompt/slice.ts`.
   The denial is a setting, and it is not a proof that the habit stopped.

## The delegation share

`just usage` runs `plugins/dotclaude-sessions/bin/dotclaude-usage`, and it repeats the scan on any machine.
It reports the sessions by entrypoint, the skill calls, the delegation share, and the latest subagent runs.

- measured, 2026-10-03, 7 days: 976 subagent runs in 25,578 main turns, which is 3.8 per 100 turns.
- measured, 2026-10-03: tool-result tokens per main session, median 19,169, p90 167,675 (253 sessions).

## Turns, not tool calls

Each model turn reads the context again, so the number of turns sets the cost.

- Independent tool calls in one response take one turn.
  The same calls in sequence take one turn each.
- Claude Code has no general tool that runs several tools in one call (binary).

## Community claims

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
  The settings snippet does not set `cleanupPeriodDays` (see [Settings snippet keys](Settings-Snippet-Keys)).

## Tools that dotclaude does not use

| Tool | Reason |
| --- | --- |
| RTK | A JetBrains measurement of 7.6% more cost (reported). |
| Graphify | It fails on large repositories (reported). |
| grepai | It needs embeddings from Ollama or OpenAI, and it has no measurement. |

## Measuring a session

`just measure` runs `tools/measure.ts`.
It reads a session transcript and prints where the context went.
It reports the first request of the session, each subagent, and the repeat reads of the same file.
The measures that led to the context bounds are in [Context and handoff](Context-And-Handoff).

## Related pages

- [Plugin layout](Plugin-Layout)
- [Agents](Agents)
- [Settings snippet](Settings-Snippet)
- [Evidence](Evidence)
- [Handoff cost](Handoff-Cost)
- [Evals](Evals)
