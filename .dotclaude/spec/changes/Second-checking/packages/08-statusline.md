---
schema: dotclaude-spec/2
kind: package
id: P08
title: Core plugin: statusline
wave: 2
deps: []
owns: ["src/plugins/dotclaude/slices/statusline/","tests/dotclaude/statusline/",".dotclaude/spec/changes/1.0.0/evidence/second-check-statusline.md"]
satisfies: []
verify: just test tests/dotclaude/statusline && just lab
agent: implementer
status: done
---

## Goal

Restore the pace arrows of 0.28.0, put ` · ` between the items of a row, and check the parse of stdin and of the git cache.

## Context

- Request of the user: the `5h` and `7d` rows of the status line lost the pace arrows of 0.28.0, such as `▼14%` (green, a reserve: the use is below the even pace of the window) and the deficit form (the use is above the pace).
  Read the 0.28.0 status line with `git show dotclaude--v0.28.0:<path>` (find the path with `git ls-tree -r --name-only dotclaude--v0.28.0 | grep -i statusline`), and restore the arrows with the same math, glyphs, and colors in the 1.0.0 slice.
  A test pins the reserve, the deficit, and the even case.
- Request of the user: put ` · ` (space, middle dot, space) between the items of a status line row.
  When the rows permit it, pad the items so that the columns of the rows align, as the 0.28.0 example of the user shows (`5h` and `7d` bars, percents, arrows, and reset times in one column each).
  Keep the width bound of `width.ts`; drop the alignment, not an item, when the row does not fit.
  Tests pin the separator and the alignment.
- `slices/statusline/adapters/cli.ts:56-62` and `git-cache.ts:99-105` parse stdin and the cache inside a try/catch; the cache is JSONL since `e9d4b4d7`.
  Confirm with a test that a torn, empty, or non-object cache gives a status line and not an exception, because the status line runs once a second (`refreshInterval: 1`).

## Steps

1. Read the 0.28.0 status line and the 1.0.0 slice, and note each difference of the `5h` and `7d` rows.
2. Write the tests of the two requests and of the cache candidate, and show that they fail on the current code where the defect is real.
3. Change the slice in the style of the code around it.
   Keep each file at 300 lines or less.
4. Search the owned paths for a bare `JSON.parse`, a non-atomic write, and a path split on `\`, and give each hit a verdict.
5. Write the evidence table to `.dotclaude/spec/changes/1.0.0/evidence/second-check-statusline.md`, with a sample of the rows before and after.

## Acceptance

- `just test tests/dotclaude/statusline && just lab` passes, or the report says that it did not run and names the cause.
- Each candidate of Context has a verdict in the evidence file.
- Each fix has a test that failed before it.

## Boundaries

- Change only the paths of `owns`.
- Do not raise a bound, skip or loosen a test, or edit a lint rule or a rule of `validate`.
- `just generate` may run in the worktree for the tests, and the commit holds no change of `plugins/`.
- Keep a public signature of the kernel.
