---
schema: dotclaude-spec/2
kind: package
id: P08
title: `statusline`
wave: 2
deps: ["P01b4"]
owns: ["src/plugins/dotclaude/slices/statusline/","tests/dotclaude/statusline/"]
satisfies: []
verify: just test tests/dotclaude/statusline && just lab && just check
agent: implementer
status: done
---

# P08 `statusline`

## Goal

Rebuild the status line as the slice `statusline`, with a CLI for `statusLine` and one for `subagentStatusLine`.
The new status line has rows of numbers and Unicode icons with no bar, a color scale of three steps for each percent, `NO_COLOR`, and a segment for the active change of the spec store.
It has no OpenSpec code.

## Context

- Your worktree has no git-ignored file.
  Before a check, run `bun install` in the worktree, and copy each git-ignored types folder of the main checkout `/Users/krystian/CodeProjects/xsyetopz/dotclaude` to the same path in the worktree: `.claude-plugin/types/` and `plugins/*/.claude-plugin/types/`.
  The type check reads them.
- Your worktree can start at an old commit.
  First run `git merge-base --is-ancestor 8642933e HEAD`, and when it fails, run `git merge --ff-only dotclaude-1-0-0`, or `git rebase dotclaude-1-0-0` when you have commits.
- The rules of the wave: `.dotclaude/spec/changes/1.0.0/packages.md:7-15`.
- The slice contract: `src/kernel/slice.ts` (the fields `cli` and `segments`), and the manifest rules: `.dotclaude/spec/changes/1.0.0/design.md:96-133`.
- The source tree of a slice: `.dotclaude/spec/changes/1.0.0/design.md:53-72`, and the code conventions: `.dotclaude/spec/changes/1.0.0/design.md:143-150`.
- What a test checks: `.dotclaude/spec/changes/1.0.0/design.md:160-172`.
- The generator writes `bin/<bin>` from `adapters/cli.ts` (`tools/generate/emit/slices.ts:72-90`).
  It writes one launcher for each slice.
  So `adapters/cli.ts` is the CLI `dotclaude-statusline`, which calls `adapters/subagents.ts` when it gets the flag `--subagent`.
- The design: `.dotclaude/spec/changes/1.0.0/workflow.md:118-125`, the files: `.dotclaude/spec/changes/1.0.0/tree.md:151-155` and `:199`, and the decision of the user: `.dotclaude/spec/changes/1.0.0/change.md:30-31`.
- The change segment reads the store with `src/kernel/spec-store.ts` (`readState`, `activeProgress`) through the `FileReader` port (`src/kernel/ports.ts`), and `src/kernel/node/fs.ts` is its adapter.
- The 0.28.0 code:
  - `plugins/dotclaude/features/statusline/` (18 files, 1566 lines), which uses `plugins/dotclaude/lib/budget.ts`, `hook-io.ts`, `errors.ts`, `tail.ts`, and `model.ts`.
    Read it for the inputs and the data that each segment shows, and do not copy its layout.
  - Its OpenSpec code: `openspec.ts`, `place.ts:2`, and `cli.ts:12,28`.
  - The tests: `tests/dotclaude/statusline/` (5 files, 1191 lines).
  - The settings: `src/plugins/dotclaude/slices/prompt/slice.ts:72-83` (`statusLine` and `subagentStatusLine`).
- The rebuild list: `tools/rebuild-pending.txt:28-30`.

## Steps

1. Write `slice.ts`, `limits.ts`, `domain/rows.ts`, `segments.ts`, `icons.ts`, `color.ts`, `width.ts`, `adapters/cli.ts`, and `adapters/subagents.ts`.
   The segments: folder, git, model, context, cost, limits, and the active change, such as `◆ 1.0.0 4/13`.
2. Move `statusLine` and `subagentStatusLine` from the settings of `prompt/slice.ts` to the settings of `statusline/slice.ts`, with the commands of the new CLI.
   Use the form of command that Claude Code runs for a plugin status line, and check it in the docs or the bundle, because the `bin/` folder of a plugin may not be on the `PATH` of the status line.
3. Write the tests in `tests/dotclaude/statusline/`: a snapshot for each width and for `NO_COLOR`, the color step at each bound, and the change segment on a fixture store and on a folder with no store.
4. Remove the 0.28.0 files and their lines in `tools/rebuild-pending.txt`.
5. Run `just generate`, `just lab`, and `just check`.

## Acceptance

- `just test tests/dotclaude/statusline`, `just lab`, and `just check` pass.
- The output has no bar character, and `NO_COLOR=1` gives no escape sequence and keeps each icon.
- `grep -rni "openspec\|features/statusline" src/plugins/dotclaude/slices tests/dotclaude/statusline` finds nothing.
- No file of the slice imports from `plugins/`, `tools/`, or `tests/`, and no file in `domain/` imports `src/kernel/node/`.

## Boundaries

- Change only the paths of `owns`, the 0.28.0 paths of `tools/rebuild-pending.txt:28-30` and those lines, and in `src/plugins/dotclaude/slices/prompt/slice.ts` only the keys `statusLine` and `subagentStatusLine`.
  Other packages of the wave change other keys of that file, and the main session resolves the merge.
- Do not change `src/kernel/` or `tools/generate/`.
  When the kernel does not have the code that you need from `plugins/dotclaude/lib/`, write it in your slice and name it in your report, because P13 deletes `lib/`.
- Do not change the drift check of `setup` (P09), which reads the `statusLine` command.
- `biome.json` has lines that exempt the 0.28.0 paths of `tools/rebuild-pending.txt` from lint rules, and `tests/support/rebuild-list.test.ts` checks that each one is on the list.
  Remove the lines of your 0.28.0 paths when you remove their lines in the list.
- Run `just generate`, and commit the generated `plugins/` with your work.
- Use arrow functions, and add no legacy shim, no alias of an old name, and no fallback for an old layout.
- Each file has 300 lines or less, and each test file has 500 lines or less.
- Commit on the branch of your worktree after each step that passes its tests, with the subject `dotclaude 1.0.0: P08 <summary>`.
  Before you reach your turn bound, report the steps that are done and the steps that are open.
