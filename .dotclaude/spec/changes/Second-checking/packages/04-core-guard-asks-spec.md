---
id: P04
deps: ["P01"]
owns: ["src/plugins/dotclaude/slices/guard/", "src/plugins/dotclaude/slices/asks/", "src/plugins/dotclaude/slices/spec/", "src/plugins/dotclaude/slices/sembr/", "src/plugins/dotclaude/slices/statusline/", "tests/dotclaude/guard/", "tests/dotclaude/asks/", "tests/dotclaude/spec/", "tests/dotclaude/sembr/", "tests/dotclaude/statusline/", ".dotclaude/spec/changes/1.0.0/evidence/second-check-core-guard-asks-spec.md"]
verify: just test tests/dotclaude/guard tests/dotclaude/statusline && just lab
agent: implementer
---

# P04 Core plugin: guard, asks, spec, sembr, statusline

## Goal

Check the guard, the asks, the spec CLI, and the status line against hostile or odd input, with the guard first because it is a safety floor.

## Context

- `slices/guard/domain/paths.ts:3,10,13` treat `/` and `\` as separators by design; `paths.ts:25-36` `C:foo`. A fix must not weaken a deny: when unsure, deny. Reading `\` as a filename character on POSIX weakens a deny, so do not change it; test the current deny and ask the user if a real case needs the change.
- Guard substitutions (commits `6b75e6b0`, `2cb1f662`): `git $(echo reset) --hard`, a backtick form, `$'...'` ANSI-C quoting, `${IFS}` between words, `env git`, `command git`, `xargs git`, a `git -c` option before the verb, an alias set in the same line.
- `slices/spec/adapters/store.ts:81` appends the lane event with no fsync; with P01 the reader reports a torn line, and `validate` must name its file and line. Delta: `specs/spec-store.md`.
- `slices/statusline/adapters/cli.ts:56-62` and `git-cache.ts:99-105` parse stdin and the cache inside a try/catch; the cache is JSONL since `e9d4b4d7`. Confirm with a test that a torn, empty, or non-object cache gives a status line and not an exception, because the status line runs once a second (`refreshInterval: 1`).
- `slices/asks`: the `truncated` return of `shell.ts` and the fail-open at `writes.ts:16`. Report to the user; do not change the policy in this package.
- Request of the user: the `5h` and `7d` rows of the status line lost the pace arrows of 0.28.0, such as `▼14%` (green, a reserve: the use is below the even pace of the window) and the deficit form (the use is above the pace). Read the 0.28.0 status line with `git show dotclaude--v0.28.0:<path>` (find the path with `git ls-tree -r --name-only dotclaude--v0.28.0 | grep -i statusline`), and restore the arrows with the same math, glyphs, and colors in the 1.0.0 slice. A test pins the reserve, the deficit, and the even case.
- Request of the user: put ` · ` (space, middle dot, space) between the items of a status line row. When the rows permit it, pad the items so that the columns of the rows align, as the 0.28.0 example of the user shows (`5h` and `7d` bars, percents, and reset times in one column each). Keep the width bound of `width.ts`; drop the alignment, not an item, when the row does not fit. Tests pin the separator and the alignment.

## Steps

1. Read the dossiers of `external/` that bear on the area (search with `grep`, never read an `export-*.jsonl` whole), and note each Claude Code claim with its file and line.
2. For each candidate of Context, write a test that fails on `ad61fb01` when the defect is real.
   If no such test is possible, mark the candidate `rejected` or `open` with the reason.
3. Fix each confirmed candidate at its cause, in the style of the code around it.
4. Search the owned paths for the same pattern (a bare `JSON.parse`, a non-atomic write, a path split on `\`), and give each hit the same test or the same verdict.
5. Write the evidence table to `.dotclaude/spec/changes/1.0.0/evidence/second-check-core-guard-asks-spec.md`.
6. Remove from `specs/` of this change each requirement that the evidence rejects.

## Acceptance

- `just test tests/dotclaude/guard tests/dotclaude/statusline && just lab` passes, or the report says that it did not run and names the cause.
- Each candidate of Context has a verdict in the evidence file.
- Each fix has a test that failed before it.

## Boundaries

- Change only the paths of `owns`.
- Do not raise a bound, skip or loosen a test, or edit a lint rule or a rule of `validate`.
- Do not run `just generate`; use `just generate --check`.
- Keep a public signature of the kernel.
