---
schema: dotclaude-spec/2
kind: package
id: P11a
title: `dotclaude-codegraph`
wave: 2
deps: ["P01b4"]
owns: ["src/plugins/dotclaude-codegraph/","tests/codegraph/"]
satisfies: []
verify: just test tests/codegraph && just lab && just check
agent: implementer
status: done
---

# P11a `dotclaude-codegraph`

## Goal

Port the add-on `dotclaude-codegraph` to one slice `graph`, with a CLI, the `SessionStart` note, and the fewest classic `PostToolUse` hooks that keep its cost low.
The add-on works with no other plugin installed.

## Context

- Your worktree has no git-ignored file.
  Before a check, run `bun install` in the worktree, and copy each git-ignored types folder of the main checkout `/Users/krystian/CodeProjects/xsyetopz/dotclaude` to the same path in the worktree: `.claude-plugin/types/` and `plugins/*/.claude-plugin/types/`.
  The type check reads them.
- Your worktree can start at an old commit.
  First run `git merge-base --is-ancestor 8642933e HEAD`, and when it fails, run `git merge --ff-only dotclaude-1-0-0`, or `git rebase dotclaude-1-0-0` when you have commits.
- The rules of the wave: `.dotclaude/spec/changes/1.0.0/packages.md:7-15`, and the add-ons: `packages.md:100,109`.
- The plugin: `.dotclaude/spec/changes/1.0.0/design.md:10,19`, and the files: `.dotclaude/spec/changes/1.0.0/tree.md:172-173`.
- The slice contract: `src/kernel/slice.ts` (the fields `hooks` and `cli`), and the manifest rules: `.dotclaude/spec/changes/1.0.0/design.md:96-133`.
- The source tree of a slice: `.dotclaude/spec/changes/1.0.0/design.md:53-72`, and the code conventions: `.dotclaude/spec/changes/1.0.0/design.md:143-150`.
- The generator:
  - It finds a plugin from `src/plugins/<p>/plugin.ts` (`tools/generate/discover.ts:61-84`), and writes `plugin.json` from it (`tools/generate/emit/manifest.ts`).
  - It writes `bin/<bin>` from `adapters/cli.ts` (`tools/generate/emit/slices.ts:72-90`), and copies the kernel closure to `plugins/<p>/kernel/` (`tools/generate/closure.ts`).
  - It writes `hooks/hooks.json` from the `hooks` of each slice, and it keeps the classic hooks of the source `src/plugins/<p>/hooks/hooks.json` (`tools/generate/emit/hooks.ts:41-60`).
  - `ClassicHook` has no `if` field.
- The 0.28.0 add-on:
  - `plugins/dotclaude-codegraph/features/graph/`: `cli.ts` (200 lines), `run-tree.ts` (118), `rules.ts` (55), and `limits.ts` (10), and the launcher `bin/dotclaude-codegraph-check`.
  - `plugins/dotclaude-codegraph/hooks/hooks.json`: a `SessionStart` hook at `:4`, a `PostToolUse` hook on `Edit|Write|MultiEdit|NotebookEdit` at `:15`, and a `PostToolUse` group on `Bash` at `:27` with 12 hooks, each with an `if` for one `git` command.
  - The sources `src/plugins/dotclaude-codegraph/hooks/hooks.json` and `description.txt`, and the tests in `tests/codegraph/`.
- The plan says 1 hook, and `design.md:10` says 1 `PostToolUse` hook and a `SessionStart` note.
  A `PostToolUse` hook on each `Bash` call with no `if` starts a process on each call, which costs more than the 12 hooks with `if`.
- The rebuild list: `tools/rebuild-pending.txt:47-50`.

## Steps

1. Write `plugin.ts` from `plugins/dotclaude-codegraph/.claude-plugin/plugin.json`, and the slice `slices/graph/`: `slice.ts`, `domain/`, `adapters/cli.ts`, and `adapters/hook.ts`.
2. Write the classic hooks so that a `Bash` call that is not one of the 12 `git` commands starts no process, with the fewest hooks that do it.
   Report the count of hooks before and after, and the reason when it is more than 2.
3. Write the tests in `tests/codegraph/`, and keep each case of the 0.28.0 tests.
4. Remove each hand-written file of `plugins/dotclaude-codegraph/` and its lines in `tools/rebuild-pending.txt`, so that `plugins/dotclaude-codegraph/` holds only generator output.
5. Run `just generate`, `just lab`, and `just check`.

## Acceptance

- `just test tests/codegraph`, `just lab`, and `just check` pass.
- `claude plugin validate --strict plugins/dotclaude-codegraph` passes.
- The description of `plugin.ts` and of the entry in `.claude-plugin/marketplace.json` are the same.
- No file of the add-on imports another plugin, `tools/`, or `tests/`.

## Boundaries

- Change only the paths of `owns`, `plugins/dotclaude-codegraph/`, the lines of `tools/rebuild-pending.txt:47-50`, and the `dotclaude-codegraph` entry of `.claude-plugin/marketplace.json`.
  Other packages of the wave change other entries of that file, and the main session resolves the merge.
- Do not change `src/kernel/` or `tools/generate/`.
  When the generator cannot write a part of the add-on, name the gap in your report.
- `biome.json` has lines that exempt the 0.28.0 paths of `tools/rebuild-pending.txt` from lint rules, and `tests/support/rebuild-list.test.ts` checks that each one is on the list.
  Remove the lines of your 0.28.0 paths when you remove their lines in the list.
- Run `just generate`, and commit the generated `plugins/` with your work.
- Use arrow functions, and add no legacy shim, no alias of an old name, and no fallback for an old layout.
- Each file has 300 lines or less, and each test file has 500 lines or less.
- Commit on the branch of your worktree after each step that passes its tests, with the subject `dotclaude 1.0.0: P11a <summary>`.
  Before you reach your turn bound, report the steps that are done and the steps that are open.
