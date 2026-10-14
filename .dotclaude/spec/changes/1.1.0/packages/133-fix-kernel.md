---
schema: dotclaude-spec/2
kind: package
id: P133
title: Fixes from the review of the kernel
wave: 2
deps: ["P107","P94","P95"]
owns: ["src/kernel/","tests/kernel/",".dotclaude/spec/changes/1.1.0/evidence/review-kernel.md"]
satisfies: ["REQ-13"]
verify: just test tests/kernel && just lab
agent: implementer
status: planned
---

## Goal

Each confirmed finding of P107, and each kernel finding of P94 and P95, has a test that fails before the fix and passes after it.

## Context

- The findings: `.dotclaude/spec/changes/1.1.0/evidence/review-kernel.md` (P107), and the findings in `src/kernel/spec-store.ts` and `src/kernel/stamp.ts` in `review-spec.md` (P94) and `review-stamp.md` (P95).
- `design.md`, "Review wave".
- A shared runtime bound changes only in `src/kernel/budget.ts`.

## Steps

1. If no review has a confirmed kernel finding, stop, and report it, so that the main session runs `dotclaude-spec drop P133 --reason "no confirmed finding"`.
2. For each confirmed finding, write its test first, and run it to show that it fails.
3. Fix the code, run `just generate`, and run the test to show that it passes.
4. Write the test name and both runs of each finding in the evidence file.
5. Run the verify command, and `just test` for the slices that import the changed file.

## Acceptance

- Each confirmed finding has a test name, a failing run, and a passing run in the evidence file.
- The verify command passes.

## Boundaries

- Fix only the confirmed findings, and write each other idea in the evidence file.
- Change the code at the cause, and add no wrapper, shim, or guard around defective code (REQ-13).
  Remove the code that the fix makes unused.
- Do not change a bound, a baseline, or a test expectation unless the user names the new value (REQ-16).
- Do not weaken or remove a test.
