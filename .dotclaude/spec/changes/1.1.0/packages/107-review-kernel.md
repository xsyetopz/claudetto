---
schema: dotclaude-spec/2
kind: package
id: P107
title: Review of the kernel
wave: 1
deps: []
owns: [".dotclaude/spec/changes/1.1.0/evidence/review-kernel.md"]
satisfies: ["REQ-13"]
verify: test -s .dotclaude/spec/changes/1.1.0/evidence/review-kernel.md && bun run lint:md
agent: reviewer
status: verified
---

## Goal

The evidence file lists each confirmed defect of `src/kernel/`, with the failing test that it needs.

## Context

- The code: `src/kernel/`, with `budget.ts`, `paths.ts`, `shell.ts`, `shell/`, `policy/`, and `node/`, and the tests in `tests/kernel/`.
- The dossier: `external/agent-failure-dossier/00-INDEX.md` and its parts `01` to `08`, with I07 and I18 first.
- The rules: `CLAUDE.md` and `.claude/rules/*.md`, with `slice-imports.md` and `hooks-module.md`.
- Leads from the kernel and test audit of 2026-10-14. No command has confirmed them yet, so the review confirms or rejects each one:
  - dead code: `CONTEXT_BLOCK_MARGIN` at `budget.ts:29` has no reader in code, but the wiki documents it in `reference/Bounds.md` and 4 other pages.
  - dead code: `SPECS_TEMP`, `SPECS_OLD`, and `HOTFIX_DIR` at `paths.ts:53-59`.
- `design.md`, "Review wave".
  `spec-store.ts` is in the review of the spec slice (P94).
  The fix package is P133.

## Steps

1. Read the code and its tests.
2. For each dossier ID I01 to I18, check whether the code has the failure or lets it through, and cite the section.
3. Check for code smells: dead code, a copy of slice code, a bound outside `budget.ts`, a silent `catch`, a tool error read as a negative, a test of prose, and a test that cannot fail.
4. Confirm each finding with a command that changes nothing, and give the command and its output.
5. For each confirmed finding, give the failing test: the input, the expected result, the actual result, and the test file.
6. List each finding that no command confirms as unconfirmed, apart from the others.
7. The main session writes the report to the evidence file.

## Acceptance

- Each confirmed finding has a dossier ID or a smell name, a command that shows it, and its failing test.
- `bun run lint:md` passes.

## Boundaries

- Read only, and run only commands that change nothing.
- Do not fix code, which P133 does.
