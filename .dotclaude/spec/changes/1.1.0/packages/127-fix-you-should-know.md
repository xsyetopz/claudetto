---
schema: dotclaude-spec/2
kind: package
id: P127
title: Fixes from the review of dcc-plugin-you-should-know
wave: 2
deps: ["P101"]
owns: ["src/plugins/dcc-plugin-you-should-know/","tests/dcc-plugin-you-should-know/",".dotclaude/spec/changes/1.1.0/evidence/review-you-should-know.md"]
satisfies: ["REQ-13"]
verify: just test tests/dcc-plugin-you-should-know && just lab
agent: implementer
status: planned
---

## Goal

Each confirmed finding of P101 has a test that fails before the fix and passes after it.

## Context

- The findings: `.dotclaude/spec/changes/1.1.0/evidence/review-you-should-know.md` (P101).
- `design.md`, "Review wave".
- `.claude/rules/plugin-imports.md` and `.claude/rules/hooks-module.md`.

## Steps

1. If P101 has no confirmed finding in the code that P68 and P69 keep, stop, and report it, so that the main session runs `dotclaude-spec drop P127 --reason "no confirmed finding"`.
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
  Remove the code that the fix makes unused.
- Do not fix code that P68 or P69 replaces.
- Do not weaken or remove a test.
