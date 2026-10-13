---
schema: dotclaude-spec/2
kind: package
id: P42
title: Agent Roster and No Turn Limit
wave: 4
deps: []
owns: ["src/plugins/dotclaude/slices/agents/limits.ts","src/plugins/dotclaude/slices/agents/domain/","src/plugins/dotclaude/slices/agents/slice.ts","the frontmatter of the agent files in src/plugins/dotclaude/slices/agents/agents/","the subagent turn note of src/plugins/dotclaude/slices/handoff/","tests/dotclaude/agents/","tests/dotclaude/handoff/context.test.ts","the turn rows of src/wiki/reference/Bounds.md and src/wiki/dotclaude/Architecture.md","tools/generate/emit/fill.ts"]
satisfies: []
verify: just check, just lab, and one session in just sandbox that starts each agent once
agent: main session
status: done
---

# P42 Agent Roster and No Turn Limit

## Goal

Each agent runs on the model and effort that the user decided, and no agent has a `maxTurns`.

## Context

- The decisions of the user: `change.md`, decisions, 2026-10-13.
- The reports: `docs/research/agents-models/`, mainly 03, 05, 06, 10, 11, and 17.
- Claude Code sets no default turn limit, and its built-in `Explore`, `Plan`, and `general-purpose` agents have none (report 06).
- A run that reaches `maxTurns` gets no last turn for its report (report 06, the loop at line 333827 of the bundle).
  The project logs show 10 lost reports at a turn limit, and the median `implementer` run is 68 calls, above the bound of 61 (reports 11 and 17).

## Steps

1. Set the frontmatter: `debugger` to `claude-opus-5-5` at `effort: medium`.
   The other agents keep their model and effort.
2. Remove `maxTurns` from each agent file, and remove `MAX_TURNS`, `domain/turns.ts`, and their tests.
   Keep the list of agent names where a test or the generator needs it.
3. Remove the subagent turn note of the `handoff` slice (`TURNS_LEFT_AT`, `maxTurnsOf`), because it works only with a `maxTurns`.
4. Remove the turn rows from the wiki sources, and run `just generate`.

## Acceptance

- No file of `src/plugins/dotclaude/` has `maxTurns`, and `just check` passes.
- A sandbox session starts each of the six agents once, and each one reports.

## Boundaries

- Do not change the agent bodies, because P47 owns them.
- Do not change the `maxTurns` reader of `dotclaude-sessions`, because it reads the agent files of each user.
