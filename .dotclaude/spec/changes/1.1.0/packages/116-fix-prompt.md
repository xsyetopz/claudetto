---
schema: dotclaude-spec/2
kind: package
id: P116
title: Fixes from the review of the prompt slice
wave: 2
deps: ["P90"]
owns: ["src/plugins/dotclaude/slices/prompt/","tests/dotclaude/prompt/",".dotclaude/spec/changes/1.1.0/evidence/review-prompt.md"]
satisfies: ["REQ-13"]
verify: just test tests/dotclaude/prompt && just lab
agent: implementer
status: planned
---

## Goal

Each confirmed finding of P90 has a test that fails before the fix and passes after it.

## Context

- The findings: `.dotclaude/spec/changes/1.1.0/evidence/review-prompt.md` (P90).
- `design.md`, "Review wave".
- The bounds: the `limits.ts` of the slice, `src/kernel/budget.ts`, and `tools/limits.ts`.

## Steps

1. If P90 has no confirmed finding other than the `rm` globs of P143, stop, and report it, so that the main session runs `dotclaude-spec drop P116 --reason "no confirmed finding"`.
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
- Do not fix the `rm` globs (P143), the sandbox block (P60, P76), or the env block (P70).
- Do not change a bound, a baseline, or a test expectation unless the user names the new value (REQ-16).
- Do not weaken or remove a test.
