---
status: accepted
date: recorded in openspec/changes/archive/2026-11-09-release-2-1-319/design.md:350 (day of decision not recorded)
---

# Test-Tampering Check Not Built

## Context and Problem Statement

Should claudetto check a change for test tampering (changed expected value, loosened comparison, skip)?

## Considered Options

- A syntax-tree check on the changed test files.
- No check.

## Decision Outcome

Chosen: no check (S-2). `git log --diff-filter=D -- '*.test.ts' '*.spec.ts'` lists 100 commits that delete a test file, so an ask on `rm *.test.ts` would fire on real work. `typescript` is absent, `Bun.Transpiler` exposes no tree, `ast-grep` is a new required tool, and `bun test` has no fail-on-skip flag. The 0.3.0 grader `W5-1_I05` lists the forms: a changed expected value, a loosened comparison (`toBe` to `toBeCloseTo`), and a skip. Two of three forms are edits no syntax check separates from a correct fix.

## Consequences

No test-tampering check ships. Basis: measured.

Source: openspec/changes/archive/2026-11-09-release-2-1-319/design.md:350.
