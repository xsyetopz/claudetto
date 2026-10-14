---
schema: dotclaude-spec/2
kind: package
id: P77
title: Execution gate on the verify record (I04)
wave: 5
deps: ["P94","P120","P146"]
owns: ["src/plugins/dotclaude/slices/spec/domain/gates.ts","src/plugins/dotclaude/slices/spec/adapters/merge.ts","src/plugins/dotclaude/slices/spec/adapters/accept.ts","src/plugins/dotclaude/slices/spec/adapters/validate.ts","tests/dotclaude/spec/verify-record.test.ts",".dotclaude/spec/changes/1.1.0/evidence/completion-gate.md"]
satisfies: ["REQ-9"]
verify: just test tests/dotclaude/spec && just lab
agent: implementer
status: planned
---

## Goal

A package reaches `done` only when its `verified` event has its own verify record: the command, the exit status, and the commit SHA.
No mechanism reads the prose of the model to find a completion claim (the prose rule of `design.md`).

## Context

- The I04 row of `00-INDEX.md`: "Execution-based gates (Stop hook or CI) and a fresh-context verifier that sees evidence, not claims".
  Its section is in `02-verification-and-honesty.md`.
- `spec/adapters/verify.ts:72-96` writes the SHA and the verify command on each `verified` event.
- The audit of 2026-10-14 found 9 `verified` events in `Second-checking/events.jsonl` (lines 9, 11, 12, 15, 18, 19, 20, 26, and 29) with the note "Converted from schema 1" and no record.
  Each `done` event of that change has no `approved` step before it, although `merge.ts:141-142` and `states.ts:44-62` refuse `verified` to `done`.
  So the events came from a writer outside the CLI.
- `validate.ts:173-201` checks the formats only.
  P146 adds the plan-gate checks, and this package adds the event checks after it.
- The completion rule of the prompt is in P64, and the `reviewer` stays the fresh-context verifier.

## Steps

1. Write the failing tests first: `merge` and `accept` on a package whose `verified` event has no SHA, no verify command, or no exit status, and on a `done` event with no `approved` step before it.
   Run them to show that they fail.
2. Add the record check to the `done` gates of `spec/domain/gates.ts`, and call it from `merge` and `accept`.
   A missing record refuses with the name of the package and the missing field.
3. `validate` reports each event of a change that breaks the transitions of `states.ts` or has no record, with its line in `events.jsonl`.
4. Add a test fixture with the shape of the 9 events of `Second-checking`, because P55 can archive that change first.
5. Run `validate` on each change in `.dotclaude/spec/changes/`, and write the output and the method to the evidence file.

## Acceptance

- The verify command passes.
- `validate` reports each event of the fixture with no record.

## Boundaries

- No model call, and no check of reply text (REQ-17).
- Do not edit an `events.jsonl` file.
  The main session decides each old event with the user in P55.
