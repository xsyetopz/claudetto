---
schema: dotclaude-spec/2
kind: package
id: P130
title: Fixes from the review of dotclaude-docs
wave: 2
deps: ["P104"]
owns: ["src/plugins/dotclaude-docs/","tests/docs/",".dotclaude/spec/changes/1.1.0/evidence/review-docs.md"]
satisfies: ["REQ-13"]
verify: just test tests/docs && just lab
agent: implementer
status: planned
---

## Goal

Each confirmed finding of P104 has a test that fails before the fix and passes after it.

## Context

- The findings: `.dotclaude/spec/changes/1.1.0/evidence/review-docs.md` (P104).
- `design.md`, "Review wave".
- `.claude/rules/plugin-imports.md`: the plugin imports nothing from another plugin.

## Steps

1. If P104 has no confirmed finding, stop, and report it, so that the main session runs `dotclaude-spec drop P130 --reason "no confirmed finding"`.
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
  Rewrite the plugin inside its contract when it is mostly wrong, and remove the code that the fix makes unused.
- Do not change a bound, a baseline, or a test expectation unless the user names the new value (REQ-16).
- Do not weaken or remove a test.
