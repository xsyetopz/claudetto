---
schema: dotclaude-spec/2
kind: package
id: P71
title: Agent turn budget (I11, I12, D2) (dropped)
wave: 3
deps: ["P80"]
owns: ["the front matter of the agent files in src/plugins/dotclaude/slices/agents/agents/","src/plugins/dotclaude/slices/agents/limits.ts","tests/dotclaude/agents/max-turns.test.ts"]
satisfies: ["REQ-9"]
verify: just test tests/dotclaude/agents && just check
agent: implementer
status: canceled
---

## Goal

The turn budget of the agents is as the user picked in D2.

## Context

- The decision of the user of 2026-10-13: "No agent has a `maxTurns`".
- The I11 row of `00-INDEX.md`, with its section in `04-engineering-delegation-and-cost.md`, and the I12 row: "turn and token budgets".
- The turn-limit notices that `dotclaude-diagnose` finds (P67).

## Steps

1. With D2 (a): record the decision in the evidence of P80, and drop this package with that reason.
2. With D2 (b): put one `maxTurns` for each agent in `agents/limits.ts`, from the turn counts of the agent runs in the transcripts.
   The generator, or a test, keeps the front matter of each agent equal to the bound.
3. A test pins each copy of each bound.

## Acceptance

- `just test tests/dotclaude/agents` and `just check` pass.

## Boundaries

- Do not change the model, the effort, or the tools of an agent.
