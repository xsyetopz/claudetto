---
schema: dotclaude-spec/2
kind: package
id: P146
title: Plan-gate checks in validate
wave: 3
deps: ["P94","P120"]
owns: ["src/plugins/dotclaude/slices/spec/adapters/validate.ts","tests/dotclaude/spec/validate-gate.test.ts"]
satisfies: ["REQ-20"]
verify: just test tests/dotclaude/spec/validate-gate.test.ts && just test tests/dotclaude/spec && just lab
agent: implementer
status: planned
---

## Goal

`dotclaude-spec validate` reports each requirement that no package satisfies and each `satisfies` ID that no requirement has, as `plan` does.

## Context

- `spec/adapters/validate.ts:173-201`: the checks of the formats, the states, the deps, and the `owns` only.
- `spec/adapters/plan.ts:47-57` and `spec/domain/change-gates.ts:26-44`: `coverageOf` and `gatePlan`.
- The agent of session `d87f7ed2` wrote its own `check.ts` and reported "plan gate: PASS" (`design.md`, "Spec CLI").
- `validate` accepts a `verify:` field that is prose and not a command.
  P78 has `verify: the user approves each deletion, then git tag --list shows no tag of a version before 1.0.0`, and `dotclaude-spec verify P78` gave `sh: the: command not found` (session `ef21d7f2`, 2026-10-14).

## Steps

1. In `validate.ts`, run `coverageOf` on the requirements and the `satisfies` of the packages of each change, with the same sources as `plan.ts`.
2. Report each uncovered requirement and each unknown ID as a problem with the path of the change.
3. Share the code with `plan.ts` through a domain function, so that the two checks cannot drift.
4. Tests `validate-gate.test.ts`: a change with full coverage is valid, an uncovered requirement is a problem, an unknown ID is a problem, and a change with no package files gives no coverage problem.

## Acceptance

- The verify command passes.
- `plugins/dotclaude/bin/dotclaude-spec validate 1.1.0` prints `Valid.` on this change.

## Boundaries

- Do not change the gate of `plan`.
- Tests check the problem count and the exit code, not message text (REQ-17).
