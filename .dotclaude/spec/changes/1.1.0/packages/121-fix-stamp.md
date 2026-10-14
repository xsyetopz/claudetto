---
schema: dotclaude-spec/2
kind: package
id: P121
title: Fixes from the review of the stamp slice
wave: 2
deps: ["P95"]
owns: ["src/plugins/dotclaude/slices/stamp/",".dotclaude/spec/changes/1.1.0/evidence/review-stamp.md"]
satisfies: ["REQ-13"]
verify: just lab
agent: implementer
status: planned
---

## Goal

Each confirmed finding of P95 has a test that fails before the fix and passes after it.

## Context

- The findings: `.dotclaude/spec/changes/1.1.0/evidence/review-stamp.md` (P95).
- `design.md`, "Review wave".
- The tests of the slice are in its `lab/` folder, which `just lab` runs.

## Steps

1. If P95 has no confirmed finding, stop, and report it, so that the main session runs `dotclaude-spec drop P121 --reason "no confirmed finding"`.
2. For each confirmed finding, write its test first, and run it to show that it fails.
3. Fix the code, run `just generate`, and run the test to show that it passes.
4. Write the test name and both runs of each finding in the evidence file.
5. Run the verify command.

## Acceptance

- Each confirmed finding has a test name, a failing run, and a passing run in the evidence file.
- The verify command passes.

## Boundaries

- Fix only the confirmed findings, and write each other idea in the evidence file.
- Change the code at the cause, and add no wrapper, shim, or guard around defective code (REQ-13).
  Rewrite the slice inside its contract when it is mostly wrong, and remove the code that the fix makes unused.
- A finding in `src/kernel/stamp.ts` goes to the list of P133, which owns `src/kernel/`.
- Do not weaken or remove a test.
