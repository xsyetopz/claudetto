---
schema: dotclaude-spec/2
kind: package
id: P76
title: Sandbox bypass (I10, D3)
wave: 5
deps: ["P60","P67"]
owns: ["the sandbox block of src/plugins/dotclaude/slices/prompt/slice.ts","tests/dotclaude/prompt/sandbox.test.ts",".dotclaude/spec/changes/1.1.0/evidence/sandbox-bypass.md"]
satisfies: ["REQ-9"]
verify: just test tests/dotclaude/prompt && just check
agent: implementer
status: planned
---

## Goal

The sandbox bypass is as the user picked in D3, and each command that needed the bypass has a better route.

## Context

- `prompt/slice.ts:106`: `allowUnsandboxedCommands: true`.
- About 330 `dangerouslyDisableSandbox` calls in 10 sessions.
- The I10 row of `00-INDEX.md` and its section in `03-safety-and-trust-boundaries.md`.
- The signing fix of P60.

## Steps

1. With `dotclaude-diagnose`, group the bypass calls by command and by the sandbox denial before each call.
   Write the groups to the evidence file.
2. For each group, name the route: a sandbox setting, an `excludedCommands` entry, a fix of the command, or none.
3. With D3 (b), set `allowUnsandboxedCommands: false`, and add the routes of step 2.
   With D3 (a), add only the routes of step 2.
4. A test on the settings: the deny rules of P60 stay, and each new `excludedCommands` entry is in the evidence file.

## Acceptance

- The tests and `just check` pass.

## Boundaries

- Do not add a route that lets a sandboxed command read a path of a `Read(...)` deny rule.
