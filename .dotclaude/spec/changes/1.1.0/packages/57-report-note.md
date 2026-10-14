---
schema: dotclaude-spec/2
kind: package
id: P57
title: Report-now note with source and role
wave: 3
deps: ["P89","P115"]
owns: ["src/plugins/dotclaude/slices/handoff/domain/context.ts","src/plugins/dotclaude/slices/handoff/adapters/mod.ts","src/plugins/dotclaude/slices/handoff/lab/","tests/dotclaude/handoff/"]
satisfies: ["REQ-10"]
verify: just test tests/dotclaude/handoff && just lab
agent: implementer
status: planned
---

## Goal

The report-now note names dotclaude as its source, tells only an agent that can commit to commit, and goes to each agent one time.

## Context

- `handoff/domain/context.ts:38-42`: `reportNote` gives "Commit your work first, then report.
  A report of 400 words or fewer is due now".
- `handoff/adapters/mod.ts:121-131`: `onToolCall` adds the note to each tool result of a subagent over the bound.
- The bounds: `SUBAGENT_CONTEXT_MAX`, `HAIKU_CONTEXT_MAX`, and `REPORT_MAX_WORDS` in `handoff/limits.ts`.
- `design.md`, "Instruction text in tool results": a planner run got the note on each tool call after 100,455 tokens.
- `.claude/rules/ste-messages.md`.

## Steps

1. Find out whether `tool.call`, `turn.step`, or `agent.spawn` gives the agent type of an `agentId`.
   Write the answer in a comment of `mod.ts` with the line of the types file.
2. The note starts with its source, such as `dotclaude handoff:`, and gives the reason: the context is over the bound.
3. An agent that can write gets "Save your work, then report".
   A read-only agent, such as `planner`, `reviewer`, `investigator`, and `researcher`, gets "Report now".
   If step 1 finds no agent type, the note says "Save your work if your task allows writes, then report".
4. The note goes one time for each agent, and it does not repeat on each tool call of the same agent (REQ-10).
   The Haiku bound stays `HAIKU_CONTEXT_MAX` 85,000 (`handoff/limits.ts:14`).
5. Tests: a lab test for each role, the one-time rule, and an agent under the bound.

## Acceptance

- `just test tests/dotclaude/handoff` and `just lab` pass.
- A second tool call of the same agent over the bound gets no note.

## Boundaries

- Do not change a bound in `handoff/limits.ts`.
- Do not change the main-session handoff.
