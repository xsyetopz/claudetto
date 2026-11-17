---
status: accepted
date: 2026-11-16
---
# Subagent Model Precedence and Pinning

## Context and Problem Statement

Which model a subagent runs on depends on four inputs, and two posters disagree about their order.

Which model do subagents run, and does one variable force it over the frontmatter model of claudetto's agents?

`SUBAGENT_MODEL_FORCE=1` drops the Agent `model` property (-444 bytes) and then drops an agent file's model unless it is `inherit`. `CLAUDE_CODE_EFFORT_LEVEL=high` outranks agent frontmatter effort and the user's `/effort`. Should the setup write either?

## Considered Options

- Order per-call `model`, agent frontmatter `model`, `CLAUDE_CODE_SUBAGENT_MODEL`, main model (docs, clawdipedia extend/subagents/frontmatter checked 2026-10-27, cited).
- One commenter: the env var beats per-call and frontmatter (reported).
- `CLAUDE_CODE_SUBAGENT_MODEL_FORCE=1` makes the env override every subagent, including ones pinned bigger (reported by two posters).
- `CLAUDE_CODE_SUBAGENT_MODEL=claude-sonnet-5-5` with `modelSettings.claude-sonnet-5-5` effort medium and `CLAUDE_CODE_SUBAGENT_MODEL_FORCE` unset.
- Set `CLAUDE_CODE_SUBAGENT_MODEL_FORCE`, which forces one model over the frontmatter model of claudetto's agents.
- Write `SUBAGENT_MODEL_FORCE=1` for the schema saving.
- Leave both unset.

## Decision Outcome

Same decision, other record: the documented order. Setup writes `CLAUDE_CODE_SUBAGENT_MODEL=claude-sonnet-5-5`; each claudetto agent names its own model and effort; no percentage-split instruction (a model picks its own about 95% of the time and errs above 70%, a poster's claim); `_FORCE` is not written (it overrides deliberately bigger agents and degrades work). Fable and Opus are never a subagent model (user decision, 2026-11-13 13:22 UTC, subagents never run on Fable or Opus (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:5560)). An agent file `model` is never validated at load; a bad `effort` warns with the list (low, medium, high, xhigh, max, or an integer) (measured).

Chosen (user decision, 2026-11-13 13:22 UTC, subagents never run on Fable or Opus (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:5560)): `CLAUDE_CODE_SUBAGENT_MODEL=claude-sonnet-5-5`, effort from `modelSettings.claude-sonnet-5-5` medium; `CLAUDE_CODE_SUBAGENT_MODEL_FORCE` unset, because it would override the frontmatter models of claudetto's agents, which the user wants kept. Built-in subagents are removed and replaced by claudetto agents for general-purpose, Plan, and Explore. Order of choice: the per-call model, the agent's frontmatter model, `CLAUDE_CODE_SUBAGENT_MODEL`, the main model (clawdipedia extend/subagents/frontmatter, "model").

Same decision, other record: the setup does not write `SUBAGENT_MODEL_FORCE`; the user answered "no". `CLAUDE_CODE_EFFORT_LEVEL` would override the `effort: medium` of claudetto agents and the user's `/effort`, so it stays unset too.

## Consequences

A lead's `Agent` call model ran four `Heracles` on Opus once, so an `agent.spawn` mod drops `model`; the root prompt names no subagent model. `CLAUDE_CODE_SUBAGENT_EFFORT` also exists on 2.1.325 (unverified in 2.1.326).

Subagents never run on Fable or Opus (user decision, 2026-11-13 13:22 UTC, subagents never run on Fable or Opus (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:5560)).

The Agent schema keeps its `model` and `effort` properties (1,942 bytes in `-p`).

## Confirmation

A setup test asserts the env value and that no `_FORCE` key is written; a test asserts each agent file names `model` and `effort`.

Source: openspec/changes/archive/2026-11-16-2-1-323/research/probes.md:35; plugins/claudetto/agents/Artemis.md@088a227c; openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1707; openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:3131; openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2104; user decision, 2026-11-05.
