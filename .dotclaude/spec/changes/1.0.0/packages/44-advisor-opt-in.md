---
schema: dotclaude-spec/2
kind: package
id: P44
title: Advisor Opt-In
wave: 4
deps: []
owns: ["the advisor entries of src/plugins/dotclaude/slices/trim/","the advisor step of src/plugins/dotclaude/slices/setup/","tests/dotclaude/trim/","tests/dotclaude/setup/","evidence/advisor.md"]
satisfies: []
verify: just check, just lab, and one session in just sandbox-install where /dotclaude:setup sets advisorModel only after the user asks
agent: main session
status: done
---

# P44 Advisor Opt-In

## Goal

The built-in advisor works when a user picks it, and it costs no token when the user does not.

## Context

- The measurement: [evidence](../evidence/advisor.md).
  With no `advisorModel`, a request has the same 49,418 bytes and 17,432 tokens as with `CLAUDE_CODE_DISABLE_ADVISOR_TOOL=1`.
  With `advisorModel: "opus"`, each request of the root and of each subagent has 1,358 tokens more.
- The decision of the user: `change.md`, decisions, 2026-10-13.

## Steps

1. Remove `CLAUDE_CODE_DISABLE_ADVISOR_TOOL` from the `trim` slice and from `REMOVED_PARTS`.
2. `/dotclaude:setup` sets no `advisorModel`.
   When the user asks for the advisor, it tells the cost from the evidence and the models that `/advisor` accepts, and then it sets `advisorModel`.
3. The setup removes no `advisorModel` that the user set.

## Acceptance

- The settings snippet has no advisor key, and `just check` passes.
- A sandbox session with the snippet shows no advisor tool, and `/advisor opus` turns it on.

## Boundaries

- Do not set an `advisorModel` for the user, and do not remove one that the user set.
