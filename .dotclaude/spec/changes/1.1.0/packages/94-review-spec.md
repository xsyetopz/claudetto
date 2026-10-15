---
schema: dotclaude-spec/2
kind: package
id: P94
title: Review of the spec slice
wave: 1
deps: []
owns: [".dotclaude/spec/changes/1.1.0/evidence/review-spec.md"]
satisfies: ["REQ-13"]
verify: test -s .dotclaude/spec/changes/1.1.0/evidence/review-spec.md && bun run lint:md
agent: reviewer
status: verified
---

## Goal

The evidence file lists each confirmed defect of `src/plugins/dotclaude/slices/spec/` and `src/kernel/spec-store.ts`, with the failing test that it needs.

## Context

- The code: `src/plugins/dotclaude/slices/spec/`, `src/kernel/spec-store.ts`, and the tests in `tests/dotclaude/spec/`.
- The dossier: `external/agent-failure-dossier/00-INDEX.md` and its parts `01` to `08`, with I04 and I05 first.
- The rules: `CLAUDE.md` and `.claude/rules/*.md`.
- Leads from the kernel and test audit of 2026-10-14. No command has confirmed them yet, so the review confirms or rejects each one:
  - tests of prose at `tests/dotclaude/spec/cli/close-phase.test.ts:75,301-302`, which assert doc text.
  - a silent `catch` at `src/kernel/spec-store.ts:65`.
  - `status <id>` in a subfolder exits 1, because `cli.ts:98,109` takes `process.cwd()` as the store root.
  - the `status` of a change in `change.md` changes only on `accept` (`transition.ts:197`), and no code links a release tag to `accept`, so 1.0.0 shows `implementing` after its tag.
  - `spec-store.ts:123-130` accepts any state, and `movePackage` (`transition.ts:167-185`) does not call `hasTransition`.
  - `spec-store.ts:135-136,157` skips a package file with no `id` and gives no error, and `files.ts:81` names the same file by its file name.
  - `verify` needs `doing` (`verify.ts:56`).
  - `verify` runs the whole `verify` field in a shell (`verify.ts:80`), but the `verify` fields of P16 and P38 to P41 of 1.0.0 are prose, such as "just check, and the user approves the version 1.0.0 and the push", and `validate` does not check that a field can run.
  - the fixture repositories of `tests/dotclaude/spec/cli/run-phase.ts:53` take the global git config of the user, so with commit signing on, 159 tests fail in the sandbox (`just check` of 2026-10-14).
    `tests/support/eval-patterns.ts:52-53` already sets `GIT_CONFIG_GLOBAL` to `/dev/null`.
- The known defects in `design.md`, "Review wave":
  `status` in a subfolder says that a change does not exist,
  `Second-checking` P07 is `done` with no verify record,
  and `states.ts:73` moves a change from `specified` to `planned` by `specify`.
- The gaps that P145 to P147 fix: no way back from `planned`, and `validate` without the plan-gate checks.
  The fix package is P120.

## Steps

1. Read the code and its tests.
2. Confirm each known defect with a command, such as `cd src && dotclaude-spec status Second-checking`.
3. Check whether a `verified` or `done` move can happen with no verify record, and whether `merge` checks it.
4. For each dossier ID I01 to I18, check whether the code has the failure or lets it through, and cite the section.
5. Check for code smells: dead code, a copy of kernel code, a bound outside `limits.ts`, a silent `catch`, a tool error read as a negative, a test of prose, and a test that cannot fail.
6. For each confirmed finding, give the command and its output, and the failing test: the input, the expected result, the actual result, and the test file.
7. List each finding that no command confirms as unconfirmed, apart from the others.
8. The main session writes the report to the evidence file.

## Acceptance

- Each known defect has a confirmed or refuted line with its command.
- Each confirmed finding has a dossier ID or a smell name, a command that shows it, and its failing test.
- `bun run lint:md` passes.

## Boundaries

- Read only, and run only commands that change nothing.
  Do not run a command that moves a state.
- Do not fix code, which P120 and P145 to P147 do.
