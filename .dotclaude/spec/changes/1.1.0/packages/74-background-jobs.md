---
schema: dotclaude-spec/2
kind: package
id: P74
title: Background job cap (I17, I12)
wave: 3
deps: ["P88","P114"]
owns: ["src/plugins/dotclaude/slices/guard/domain/background.ts","src/plugins/dotclaude/slices/guard/limits.ts","src/plugins/dotclaude/slices/guard/adapters/mod.ts","src/plugins/dotclaude/slices/guard/slice.ts","src/plugins/dotclaude/slices/guard/lab/background.test.ts"]
satisfies: ["REQ-9"]
verify: just test tests/dotclaude/guard && just lab
agent: implementer
status: planned
---

## Goal

A session cannot start a background job that runs the same command as a live job, or more live jobs than a bound.

## Context

- The I17 row of `00-INDEX.md`: "Locks with PID and owner; tool error ≠ negative; one watcher; kill by PID".
  Its section is in `07-measurement-and-environment.md`.
- The I12 row: "turn and token budgets".
- A `Bash` call with `run_in_background` starts a job, and the job ends when it exits or is killed.
- The `guard` slice: `guard/adapters/mod.ts`, `guard/domain/deny.ts`.

## Steps

1. Read both sections, and cite them in `background.ts`.
2. Find how a hook learns that a background job ended: a tool result, a notice, or a kill call.
3. Keep the live jobs of each session and agent in the module state.
4. Refuse a new job with the same command as a live job, and a job above `MAX_BACKGROUND_JOBS` in `guard/limits.ts`.
   The reason names the live job and tells Claude to read its output or stop it.
5. Tests: a first job, a duplicate, a job over the bound, a job after another ended, and two agents.

## Acceptance

- `just test tests/dotclaude/guard` and `just lab` pass.

## Boundaries

- Do not change the other guard rules.
