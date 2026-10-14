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
