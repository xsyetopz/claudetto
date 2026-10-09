# Router

This page records the model and effort facts that the router of dotclaude uses.
The router code is in `plugins/dotclaude/features/router/`.
The table is in `data.mjs`, and the allowed efforts of each model are in `limits.mjs`.
The user set the table on 2026-10-09 from the eval report `evals/results/2026-10-09T12-16-54-262Z` and the effort guide of Anthropic (design D12).

## Tables

Subagent table, one pair for each task class:

| Class | Model | Effort |
| --- | --- | --- |
| `search` | Haiku 5.5 | `medium` |
| `tests` | Haiku 5.5 | `low` |
| `web` | Haiku 5.5 | `medium` |
| `bulk` | Haiku 5.5 | `medium` |
| `scoped` | Haiku 5.5 | `medium` |
| `debug` | Haiku 5.5 | `high` |
| `review` | Sonnet 5.5 | `medium` |
| `audit` | Sonnet 5.5 | `high` |
| `plan` | Haiku 5.5 | `medium` |
| `orchestration` | Haiku 5.5 | `medium` |

- A `debug` task goes to Opus 5.5 `medium` after two failed fixes (`DEBUG_ESCALATED`).
- A Haiku 5.5 task with a prompt over 100K tokens goes to Sonnet 5.5 `medium`.
- The effort guide says that Haiku 5.5 should "Start with `medium` for most work, including agentic coding".
  At `low`, "the model is more likely to skip a search, stop early, or skip a check".
  The guide gives `high` to longer agent tasks.
- Each Haiku 5.5 pair lost on `review`, and Sonnet 5.5 `low` had no loss.
- The `search`, `web`, `bulk`, and `audit` cases do not separate the pairs (task 11.12).
  For this reason, `audit` does not go below the review model.
- The rows `debug` and `audit`, and each `medium` that is one step above a tested `low`, are **inferred**, not measured.

Main-loop effort, on the model of the session:

| Class | Effort |
| --- | --- |
| `plan` | `high` |
| `review` | `high` |
| `debug` | `high` |
| `orchestration` | `medium` |

## Routes

The router makes no model call.
It reads the task text and the state, and the handlers are in `features/router/hooks.mjs`.

| Event | What the handler does |
| --- | --- |
| `prompt.submit` | Classifies the prompt of the user and keeps the decision for the first step of its turn. A notification, a peer message, and a scheduled prompt get no decision. |
| `agent.spawn` | Classifies the task, sets the routed model on the spawn, and keeps the pair of the subagent by its `agentId`. It skips a fork, a teammate, a workflow agent, and a spawn that has a `model`. |
| `turn.step` | Sets `model` and `effort` on each request, because each step input carries the session values again (probes 2.4 and 2.10). |

- The handler of `agent.spawn` runs before the handler of the prompt variant, so the variant block is the one of the routed model.
- A subagent gets its pair at every step.
  The main loop gets the rewrite of the first step of a turn at every step of that turn, and never changes in the middle of a turn.
- The effort that the user set comes from `effortLevel` in the settings.
  The router never goes above it.
- The main loop keeps the model of the session and changes only the effort (probe 2.16).
  An effort change keeps the prompt cache, and a model change rebuilds the whole prefix once.
  Anthropic also says "Tuning effort is often a better lever than switching models" (choosing-a-model page).
  There is no model-switch rule.
- The effort of the main loop comes from `MAIN_EFFORT` in `data.mjs`.
  The caps are the step effort and `effortLevel`, and the lower one wins.
- Before 0.28.0, the main-loop rows used the table of the subagents.
  A row on another model than the session did nothing.
- `failedFixes` is 0 in the state, so the debug task does not yet escalate to Opus 5.5.

## Classic fallback

`features/router/cli.mjs` is a classic `PreToolUse` command hook on `Agent`.
It is the fallback of design D13, for the case that the `turn.step` route fails.
It does nothing until the value `DOTCLAUDE_ROUTER_ROUTE=classic` is set, for example in `env` of the settings.
With the value set, it returns `updatedInput` with `model` as an alias and `effort`, and no permission decision.
The module then sees a `model` in the input as an explicit choice, and leaves that spawn alone.
The profile does not set the value.
The hook is a classic command hook, so it may import `node:` modules.

## Model ids

- The router sets the full model id, such as `claude-haiku-5-5`, and never an alias.
- A full id works in `agent.spawn`.
  A probe hook set `claude-fable-5-1`, and the transcript records the subagent as `claude-fable-5-1` (probe 2.10).
- The `Agent` tool input takes only the alias enum `sonnet`, `opus`, `haiku`, and `fable`.
  For this reason, the classic `PreToolUse` fallback on `Agent` must set an alias.

## The `haiku` alias

The alias maps to a different model on each provider.
The source is the [model-config docs](https://code.claude.com/docs/en/model-config).

| Provider | `haiku` resolves to |
| --- | --- |
| Anthropic API (first party) | `claude-haiku-5-5`, checked by probe 2.10 |
| Amazon Bedrock | `claude-haiku-4-5` |
| Google Vertex AI | `claude-haiku-4-5` |
| Microsoft Foundry | `claude-haiku-4-5` |

The Bedrock, Vertex, and Foundry rows come from the docs.
No probe ran on them, because the test machine has no access.
For this reason, the router uses the full id `claude-haiku-5-5`.

## Effort clamp

- A hook that sets effort `max` gives a request with `xhigh` on Haiku 5.5, Sonnet 5.5, and Opus 5.5.
  This is true for the `PreToolUse` route and for the `turn.step` route (probe 2.10, runs `EFF1B` and `EFF1C`).
- `maxEffortLevel: "max"` does not cause the clamp, because Claude Code treats `max` as no cap.
- The source of the clamp is not verified.
  It is probably a cap of the account for each model.
- The router treats `xhigh` as the top effort and never sets `max`.
  It also never sets `xhigh` on Sonnet 5.5 as a default (design D12).

## Values that stop the router

The router does not route when `CLAUDE_CODE_EFFORT_LEVEL` or `CLAUDE_CODE_SUBAGENT_MODEL_FORCE` is set, because each value defeats it.
It reports the value instead, as a line of the drift check at the start of the session ([Parts](Parts#drift-check)).
The profile never sets either value ([Off switches](Off-Switches)).
