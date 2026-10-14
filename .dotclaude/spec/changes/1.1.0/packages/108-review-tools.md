---
schema: dotclaude-spec/2
kind: package
id: P108
title: Review of the tools folder
wave: 1
deps: []
owns: [".dotclaude/spec/changes/1.1.0/evidence/review-tools.md"]
satisfies: ["REQ-13"]
verify: test -s .dotclaude/spec/changes/1.1.0/evidence/review-tools.md && bun run lint:md
agent: reviewer
status: planned
---

## Goal

The evidence file lists each confirmed defect of `tools/`, with the failing test that it needs.

## Context

- The code: `tools/`, with `generate/`, `lab.ts`, `lock.ts`, `release.ts`, `bump-version.ts`, `sandbox/`, and `limits.ts`, and the tests in `tests/tools/`.
- The dossier: `external/agent-failure-dossier/00-INDEX.md` and its parts `01` to `08`, with I16 and I17 (`lock.ts` and the eval lock) first.
- The rules: `CLAUDE.md` and `.claude/rules/*.md`.
- `design.md`, "Review wave".
  The fix package is P134.

## Steps

1. Read the code and its tests.
2. For each dossier ID I01 to I18, check whether the code has the failure or lets it through, and cite the section.
3. Check for code smells: dead code, a copy of kernel code, a bound outside `tools/limits.ts`, a silent `catch`, a tool error read as a negative, a test of prose, and a test that cannot fail.
4. Confirm each finding with a command that changes nothing, and give the command and its output.
5. For each confirmed finding, give the failing test: the input, the expected result, the actual result, and the test file.
6. List each finding that no command confirms as unconfirmed, apart from the others.
7. The main session writes the report to the evidence file.

## Acceptance

- Each confirmed finding has a dossier ID or a smell name, a command that shows it, and its failing test.
- `bun run lint:md` passes.

## Boundaries

- Read only, and run only commands that change nothing.
  Do not run `just release`, `just bump`, `just wiki`, or a paid eval.
- Do not fix code, which P134 does.
