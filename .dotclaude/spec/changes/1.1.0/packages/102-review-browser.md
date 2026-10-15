---
schema: dotclaude-spec/2
kind: package
id: P102
title: Review of dotclaude-browser
wave: 1
deps: []
owns: [".dotclaude/spec/changes/1.1.0/evidence/review-browser.md"]
satisfies: ["REQ-13"]
verify: test -s .dotclaude/spec/changes/1.1.0/evidence/review-browser.md && bun run lint:md
agent: reviewer
status: verified
---

## Goal

The evidence file lists each confirmed defect of `src/plugins/dotclaude-browser/`, with the failing test that it needs.

## Context

- The code: `src/plugins/dotclaude-browser/`, and the tests in `tests/browser/`.
- The dossier: `external/agent-failure-dossier/00-INDEX.md` and its parts `01` to `08`, with I08 and I10 first.
- The rules: `CLAUDE.md` and `.claude/rules/*.md`, with `plugin-imports.md`.
- `design.md`, "Review wave".
  The fix package is P128.

## Steps

1. Read the code and its tests.
2. For each dossier ID I01 to I18, check whether the code has the failure or lets it through, and cite the section.
3. Check for code smells: dead code, an import from another plugin, a bound outside `limits.ts`, a silent `catch`, a tool error read as a negative, a test of prose, and a test that cannot fail.
4. Confirm each finding with a command that changes nothing, and give the command and its output.
5. For each confirmed finding, give the failing test: the input, the expected result, the actual result, and the test file.
6. List each finding that no command confirms as unconfirmed, apart from the others.
7. The main session writes the report to the evidence file.

## Acceptance

- Each confirmed finding has a dossier ID or a smell name, a command that shows it, and its failing test.
- `bun run lint:md` passes.

## Boundaries

- Read only, and run only commands that change nothing.
- Do not fix code, which P128 does.
