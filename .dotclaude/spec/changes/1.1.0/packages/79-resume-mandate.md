---
schema: dotclaude-spec/2
kind: package
id: P79
title: Resume mandate (moved from 1.0.0 P43)
wave: 4
deps: ["P83","P109"]
owns: ["src/plugins/dotclaude/slices/agents/hooks/","src/plugins/dotclaude/slices/agents/lab/","src/plugins/dotclaude/slices/agents/slice.ts","tests/dotclaude/agents/resume.test.ts",".dotclaude/spec/changes/1.1.0/evidence/resume-mandate.md"]
satisfies: ["REQ-11"]
verify: just test tests/dotclaude/agents && just lab, and one sandbox session where an agent stops without a report and the root resumes it
agent: main session
status: planned
---

## Goal

The root resumes a stopped agent with `SendMessage`, and it cannot start a new agent while a stopped agent is not resumed.

## Context

- The brief of 1.0.0: `.dotclaude/spec/changes/1.0.0/packages/43-resume-mandate.md`.
- The decision of the user, 2026-10-13: a hook enforces the mandate with no escape.
- `Explore` and `Plan` cannot be resumed.

## Steps

1. In `just sandbox`, find how a hook tells that an agent stopped without a final report, and write it to the evidence file.
2. A `SubagentStop` hook, or its mod event, records each such agent by session id in `.dotclaude/`.
3. A check on `Agent` refuses a new start while a recorded agent is not resumed, and names the agent id and `SendMessage`.
4. The record clears on a resume, or when the resume fails because the context of the agent is full.
5. Lab tests: a stop, a refused start, a resume, and a full context.

## Acceptance

- `just test tests/dotclaude/agents` and `just lab` pass, and the sandbox session shows the refusal and the resume.

## Boundaries

- No setting, env var, or model text turns the refusal off.
- Do not change the agent files, which P80 owns.
