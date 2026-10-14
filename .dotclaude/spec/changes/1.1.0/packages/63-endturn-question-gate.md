---
schema: dotclaude-spec/2
kind: package
id: P63
title: End-turn gate for plain-text questions (dropped)
wave: 3
deps: []
owns: ["src/plugins/dotclaude/slices/endturn/question/"]
satisfies: ["REQ-3"]
verify: plugins/dotclaude/bin/dotclaude-spec status 1.1.0
agent: main session
status: canceled
---

## Goal

None.
The user dropped this package on 2026-10-14, and P55 runs `drop P63` after the plan gate.

## Context

- The decision of the user, 2026-10-14: plain-text questions are fixed by prompting only, and no hook acts on a text pattern of the prose of Claude.
- REQ-3 is covered by P62, P64, and P157, not by this package.
- D8 has nothing left to decide, and `design.md` marks it replaced.

## Steps

1. The main session runs `dotclaude-spec drop P63 --reason "user 2026-10-14: questions are fixed by prompting only"` after the plan gate.

## Acceptance

- `dotclaude-spec status 1.1.0` shows P63 as `canceled`.

## Boundaries

- Do not build a `Stop` hook, a mod, or a text detector for questions.
