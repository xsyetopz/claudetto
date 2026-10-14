---
schema: dotclaude-spec/2
kind: package
id: P73
title: Instruction text in tool results (D6) (dropped)
wave: 2
deps: ["P57","P58"]
owns: ["src/plugins/dotclaude/slices/toolresult/","tests/dotclaude/toolresult/"]
satisfies: ["REQ-10"]
verify: just test tests/dotclaude/toolresult && just lab
agent: implementer
status: canceled
---

## Goal

dotclaude acts on the survey of P58 as the user picked in D6.

## Context

- The survey: `.dotclaude/spec/changes/1.1.0/evidence/injected-instructions.md`.
- The fix of the dotclaude note: P57.
- The I10 row of `00-INDEX.md`: "Architecture (Rule of Two, capability/data-flow control, egress limits) over detectors".

## Steps

1. With D6 (a): a lab test that each `context` string that a core slice adds to a tool result starts with its `dotclaude <slice>:` source tag.
   Fix each slice that fails, in a follow-up package for the slice that owns it.
2. With D6 (b): also a `tool.result` or `PostToolUse` handler that adds one source line to a tool result from a file or the web that holds instruction-shaped text.
   The patterns come from the survey, and their bounds go in `toolresult/limits.ts`.
3. Tests for the chosen option.

## Acceptance

- `just test tests/dotclaude/toolresult` and `just lab` pass.

## Boundaries

- Do not remove or change the text of a tool result.
- No model call.
