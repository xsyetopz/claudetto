---
schema: dotclaude-spec/2
kind: package
id: P134
title: Fixes from the review of the tools folder
wave: 2
deps: ["P108"]
owns: ["tools/","tests/tools/",".dotclaude/spec/changes/1.1.0/evidence/review-tools.md"]
satisfies: ["REQ-13"]
verify: just test tests/tools && just lab
agent: implementer
status: planned
---

## Goal

Each confirmed finding of P108 has a test that fails before the fix and passes after it.

## Context

- The findings: `.dotclaude/spec/changes/1.1.0/evidence/review-tools.md` (P108).
- `design.md`, "Review wave".
- A repository bound changes only in `tools/limits.ts`.

## Steps

1. If P108 has no confirmed finding, stop, and report it, so that the main session runs `dotclaude-spec drop P134 --reason "no confirmed finding"`.
2. For each confirmed finding, write its test first, and run it to show that it fails.
3. Fix the code, and run the test to show that it passes.
4. Write the test name and both runs of each finding in the evidence file.
5. Run the verify command.

## Acceptance

- Each confirmed finding has a test name, a failing run, and a passing run in the evidence file.
- The verify command passes.

## Boundaries

- Fix only the confirmed findings, and write each other idea in the evidence file.
- Change the code at the cause, and add no wrapper, shim, or guard around defective code (REQ-13).
  Remove the code that the fix makes unused.
- Do not run `just release`, `just bump`, `just wiki`, or a paid eval.
- Do not change a bound, a baseline, or a test expectation unless the user names the new value (REQ-16).
- Do not weaken or remove a test.
