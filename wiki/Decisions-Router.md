# Decisions: router and agents

This page holds D12, D13, and D25.
The index is [Decisions](Decisions).
The facts of the router are in [Router](Router).

## D12 Router table search

The evals do not pin one model for each agent.
They tune a router table, which maps a task class to a model and an effort.

- The starting table is in `features/router/data.mjs`.
  It comes from the task taxonomy of `research/model-routing.md`.
- The `never` row bans `max` on any model and `xhigh` on Sonnet 5.5 as defaults.
- The harness runs the cases of each class, tries pairs from the cheapest, and stops at the first pair with no loss in the resolve rate, the over-claim rate, and the policy-violation rate ([Evals](Evals#router-search)).
- Haiku 5.5 can skip checks at low and medium effort, so the over-claim rate is a pass condition.
- Haiku 5.5 costs 5 times as much for each request above 100K prompt tokens.
  The router sends a task with a long prompt to Sonnet 5.5, and a Haiku 5.5 subagent reports before its context reaches 100K ([Context bound](Context-Bound)).
- `claude-haiku-4-5` leaves the roster.
- The research gives no effort cost index for the 5.5 models, so only the evals set the final table.

## D13 Router routes and cap

The router is deterministic.
It uses rules on task text and state, and it makes no model call.

1. `prompt.submit` classifies the user prompt and stores the decision.
   `agent.spawn` classifies the subagent task and stores the pair by `agentId`.
1. `turn.step` applies `model` and `effort` to each request, for the main loop and for subagents.
1. The classic `PreToolUse` fallback on `Agent` returns `updatedInput` with `model` and `effort`.

Rules:

- The router skips `fork` spawns and leaves an explicit `model` or `effort` alone.
- The profile sets `maxEffortLevel` to `max`, which is no cap, so the router has its own cap.
- The router never sets `CLAUDE_CODE_EFFORT_LEVEL` or `CLAUDE_CODE_SUBAGENT_MODEL_FORCE`, because each defeats it.
  When either is set, the router reports it and does not route.
- An effort switch keeps the prompt cache, so the router can set effort at any step.
  A model switch rebuilds the whole prefix once, so the router never switches the main-loop model and routes only its effort.
- The top effort is `xhigh`, because a hook-set `max` arrives as `xhigh`.
- The router uses the full id `claude-haiku-5-5`, because the `haiku` alias is Haiku 4.5 on Bedrock, Vertex, and Foundry.
- Open item: the source of the `xhigh` cap is not verified ([Open items](Open-Items)).

## D25 Agent roster

The user decided on five agents, from the research and the probes.
The Claude Code docs give no number of agents.
They say to define an agent for a worker that repeats, and to keep work that shares context in the main conversation.

- The roster, the turn limits, and the pins are in [Agents](Agents).
- No agent has the `Agent` tool.
- Each `maxTurns` holds one spare turn for the report.
- Planning and orchestration stay in the main loop.
- Fable 5.1 has no task class and runs only when the user selects it.
- Setup turns off the five built-in agents ([Off switches](Off-Switches#built-in-agents)).
  Each listed agent costs tokens at each start.

## Related pages

- [Router](Router)
- [Agents](Agents)
- [Plans and models](Plans-and-Models)
