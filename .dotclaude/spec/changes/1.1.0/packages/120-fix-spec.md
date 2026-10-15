---
schema: dotclaude-spec/2
kind: package
id: P120
title: Fixes from the review of the spec slice
wave: 2
deps: ["P94"]
owns: ["src/plugins/dotclaude/slices/spec/","tests/dotclaude/spec/",".dotclaude/spec/changes/1.1.0/evidence/review-spec.md"]
satisfies: ["REQ-13"]
verify: just test tests/dotclaude/spec && just lab
agent: implementer
status: planned
---

## Goal

Each confirmed finding of P94 has a test that fails before the fix and passes after it, with the known defects first.

## Context

- The findings: `.dotclaude/spec/changes/1.1.0/evidence/review-spec.md` (P94).
- The known defects in `design.md`, "Review wave": `status` in a subfolder, a `done` package with no verify record, and `states.ts:73`.
- The bounds: the `limits.ts` of the slice, `src/kernel/budget.ts`, and `tools/limits.ts`.
- Two defects of `merge` from the OpenJoystickDriver session of 2026-10-14 (transcript `76529e5a`, line 274).
  No command in this repository has confirmed them yet, so write the failing test first:
  - `adapters/merge.ts:180` runs `just generate` when a `justfile` exists, but it does not check that the recipe exists.
    A project with a `justfile` and no `generate` recipe cannot merge a package.
  - `adapters/merge.ts:202` runs `git add` on the folder of the change, and the commit fails when `.gitignore` ignores `/.dotclaude/`.
    Git says "pathspec ... did not match any file(s) known to git", and `merge` moves the state back, so the package cannot get to `done`.
- The `just generate` defect repeats in the later OpenJoystickDriver sessions `6c3752d7` (lines 161 and 169) and `44b42f2b` (lines 83 and 152), with "error: justfile does not contain recipe `generate`".
  The git merge lands, but `merge` writes no `done` event.
  The model then wrote the `done` events by hand with a script (`44b42f2b` line 168, and `6c3752d7` line 187 for P9, P2, P15, and P13), which goes around the store.
- In `6c3752d7` line 142, `review` refused with "This is a linked git worktree.
  Only the main checkout records a review", and the model told the user to run `!` commands (lines 137 and 144).

## Steps

1. If P94 has no confirmed finding, stop, and report it, so that the main session runs `dotclaude-spec drop P120 --reason "no confirmed finding"`.
2. For each confirmed finding, write its test first, and run it to show that it fails.
   A test of the subfolder defect runs the command with a cwd under the repository root.
3. Fix the code, run `just generate`, and run the test to show that it passes.
4. Write the test name and both runs of each finding in the evidence file.
5. Run the verify command.

## Acceptance

- Each confirmed finding has a test name, a failing run, and a passing run in the evidence file.
- `cd src && plugins/dotclaude/bin/dotclaude-spec status Second-checking` finds the change, run from the repository root path.
- The verify command passes.

## Boundaries

- Fix only the confirmed findings, and write each other idea in the evidence file.
- Change the code at the cause, and add no wrapper, shim, or guard around defective code (REQ-13).
  Rewrite the slice inside its contract when it is mostly wrong, and remove the code that the fix makes unused.
- A finding in `src/kernel/spec-store.ts` goes to the list of P133, which owns `src/kernel/`.
- Do not add the `unplan` command or the gate checks of `validate`, which P145 and P146 own.
- Do not edit an `events.jsonl` by hand.
- Do not weaken or remove a test.
