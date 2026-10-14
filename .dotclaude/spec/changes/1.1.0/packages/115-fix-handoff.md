---
schema: dotclaude-spec/2
kind: package
id: P115
title: Fixes from the review of the handoff slice
wave: 2
deps: ["P89"]
owns: ["src/plugins/dotclaude/slices/handoff/","tests/dotclaude/handoff/",".dotclaude/spec/changes/1.1.0/evidence/review-handoff.md"]
satisfies: ["REQ-13"]
verify: just test tests/dotclaude/handoff && just lab
agent: implementer
status: planned
---

## Goal

Each confirmed finding of P89 has a test that fails before the fix and passes after it.

## Context

- The findings: `.dotclaude/spec/changes/1.1.0/evidence/review-handoff.md` (P89).
- Handoff defect 1, from the `debugger` run of 2026-10-14 (lab and bin, the live run did not start): `runBin` (`handoff/adapters/mod.ts:100-105`) calls `$.process.run` with no `cwd`.
  After a `cd` to a subfolder, `newest` (`adapters/cli.ts:36,46`) finds no `.dotclaude/handoff` and exits 1, so `resume` (`mod.ts:156`) gives `false`.
  The fix gives `{ cwd: await $.session.root() }`, which the types file documents as the project root.
  The same path runs `dotclaude-spec next`.
- `design.md`, "Review wave".
- The bounds: the `limits.ts` of the slice, `src/kernel/budget.ts`, and `tools/limits.ts`.

## Steps

1. Fix handoff defect 1 first: the lab stub checks `e.cwd`, so its test fails before the fix.
   Then, if P89 has no other confirmed finding apart from the report-now note of P57, stop, and report it, so that the main session runs `dotclaude-spec drop P115 --reason "no confirmed finding"`.
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
- Do not fix the report-now note, which P57 owns, or the handoff parts, which P70 owns.
- Do not change a bound, a baseline, or a test expectation unless the user names the new value (REQ-16).
- Do not weaken or remove a test.
