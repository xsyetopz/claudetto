---
schema: dotclaude-spec/2
kind: package
id: P65
title: End-turn check for social padding (dropped)
wave: 4
deps: ["P63"]
owns: ["src/plugins/dotclaude/slices/endturn/padding/"]
satisfies: ["REQ-4"]
verify: plugins/dotclaude/bin/dotclaude-spec status 1.1.0
agent: main session
status: canceled
---

## Goal

None.
The user dropped this package on 2026-10-14, and P55 runs `drop P65` after the plan gate.

## Context

- The decision of the user, 2026-10-14: "these openings shall never be blocked by regex. it is a prompting problem."
- No hook, regex, or text detector acts on an opener, an apology, a preamble, self-narration, or social padding, with a block or with a note.
- REQ-4 is covered by P64, P153, P80, and P157, not by this package.
- D7 is replaced by this decision in `design.md`.

## Steps

1. The main session runs `dotclaude-spec drop P65 --reason "user 2026-10-14: openers are fixed by prompting only"` after the plan gate.

## Acceptance

- `dotclaude-spec status 1.1.0` shows P65 as `canceled`.

## Boundaries

- Do not build a hook or a detector for openers.
