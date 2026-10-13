---
id: P04
deps: ["P01"]
owns: ["src/plugins/dotclaude/slices/guard/", "src/plugins/dotclaude/slices/asks/", "src/plugins/dotclaude/slices/spec/", "src/plugins/dotclaude/slices/sembr/", "src/kernel/spec-store.ts", "tests/kernel/spec-store.test.ts", "tests/dotclaude/guard/", "tests/dotclaude/asks/", "tests/dotclaude/spec/", "tests/dotclaude/sembr/", ".dotclaude/spec/changes/1.0.0/evidence/second-check-core-guard-asks-spec.md"]
verify: just test tests/dotclaude/guard tests/dotclaude/asks tests/dotclaude/spec tests/kernel && just lab
agent: implementer
---

# P04 Core plugin: guard, asks, spec, sembr

## Goal

Check the guard, the asks, and the spec CLI against hostile or odd input, with the guard first because it is a safety floor.
Apply the two decisions of the user on the torn line and on the shell bound.

## Context

- `slices/guard/domain/paths.ts:3,10,13` treat `/` and `\` as separators by design; `paths.ts:25-36` `C:foo`.
  A fix must not weaken a deny: when unsure, deny.
  Reading `\` as a filename character on POSIX weakens a deny, so do not change it; test the current deny and ask the user if a real case needs the change.
- Guard substitutions (commits `6b75e6b0`, `2cb1f662`): `git $(echo reset) --hard`, a backtick form, `$'...'` ANSI-C quoting, `${IFS}` between words, `env git`, `command git`, `xargs git`, a `git -c` option before the verb, an alias set in the same line.
- Decision of the user (2026-10-13), torn line: fix it.
  P01 showed that a torn last line of `events.jsonl` makes the change unreadable (`src/kernel/spec-store.ts:51-57,82`), and that a fix in the reader alone does not hold, because `slices/spec/adapters/store.ts:79` puts a line end before the next append and the torn line becomes a middle line.
  Fix both ends:
  the writer (`store.ts` `appendEvent`) removes a torn tail (a last line with no line end that is not JSON) before it appends,
  and the reader skips a torn last line with no line end and reports it, so that `dotclaude-spec validate` names its file and line.
  A non-JSON middle line still stops the reader, as `CHANGELOG.md:151` documents.
  Delta: `specs/spec-store.md`; make it match the fix.
- Decision of the user (2026-10-13), shell bound: fail closed. `src/kernel/shell.ts:114-115` returns `truncated` past 200,000 characters, and `slices/asks/domain/writes.ts:154` then returns no write ask, while `git.ts:115,132` asks on `truncated`.
  Make `writes.ts` ask on `truncated`, as `git.ts` does, with a test that fails first.
- `slices/spec/adapters/store.ts:81` appends the lane event with no fsync; give it a verdict.
- `slices/asks` and `slices/sembr`: search for a bare `JSON.parse`, a non-atomic write, and a path split on `\`.

## Steps

1. Read the dossiers of `external/` that bear on the area (search with `grep`, never read an `export-*.jsonl` whole), and note each Claude Code claim with its file and line.
2. For each candidate of Context, write a test that fails on `ad61fb01` when the defect is real.
   If no such test is possible, mark the candidate `rejected` or `open` with the reason.
3. Fix each confirmed candidate at its cause, in the style of the code around it.
4. Search the owned paths for the same pattern (a bare `JSON.parse`, a non-atomic write, a path split on `\`), and give each hit the same test or the same verdict.
5. Write the evidence table to `.dotclaude/spec/changes/1.0.0/evidence/second-check-core-guard-asks-spec.md`.
6. Report each requirement of `specs/` of this change that the evidence rejects.

## Acceptance

- `just test tests/dotclaude/guard tests/dotclaude/asks tests/dotclaude/spec tests/kernel && just lab` passes, or the report says that it did not run and names the cause.
- Each candidate of Context has a verdict in the evidence file.
- Each fix has a test that failed before it.

## Boundaries

- Change only the paths of `owns`.
- Do not raise a bound, skip or loosen a test, or edit a lint rule or a rule of `validate`.
- `just generate` may run in the worktree for the tests, and the commit holds no change of `plugins/`.
- Keep a public signature of the kernel.
