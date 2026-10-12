---
id: P03
deps: [P02]
owns: ["src/plugins/dotclaude/slices/spec/slice.ts", "src/plugins/dotclaude/slices/spec/limits.ts", "src/plugins/dotclaude/slices/spec/adapters/", "src/plugins/dotclaude/slices/spec/templates/", "tests/dotclaude/spec/cli/", "spec/changes/1.0.0/state.json"]
verify: just test tests/dotclaude/spec && just check && plugins/dotclaude/bin/dotclaude-spec validate 1.0.0
agent: implementer
---

# P03 `spec` CLI

## Goal

Write the adapters of the `spec` slice and the CLI `dotclaude-spec`, with each command of the workflow, on the domain code of P02.
Then write `state.json` of the change 1.0.0, so that the main session moves the lanes with the CLI.

## Context

- Your worktree has no git-ignored file.
  Before a check, run `bun install` in the worktree, and copy each git-ignored types folder of the main checkout `/Users/krystian/CodeProjects/xsyetopz/dotclaude` to the same path in the worktree: `.claude-plugin/types/` and `plugins/*/.claude-plugin/types/`.
  The type check reads them.
- Your worktree can start at an old commit.
  First run `git merge-base --is-ancestor 8642933e HEAD`, and when it fails, run `git merge --ff-only dotclaude-1-0-0`, or `git rebase dotclaude-1-0-0` when you have commits.
- The rules of the wave: `spec/changes/1.0.0/packages.md:1-15`.
- The store, the formats, the state, the sizes, and the commands: `spec/changes/1.0.0/workflow.md:3-72`.
- The files: `spec/changes/1.0.0/tree.md:144-150`.
- The slice contract: `src/kernel/slice.ts` (the field `cli`), and the manifest rules: `spec/changes/1.0.0/design.md:96-133`, with the `schema` rule at `:132-133`.
- The source tree of a slice: `spec/changes/1.0.0/design.md:53-72`, and the code conventions: `spec/changes/1.0.0/design.md:143-150`.
  A class fits the open store of one CLI run (`design.md:148`).
- The generator writes `bin/<bin>` from `adapters/cli.ts` (`tools/generate/emit/slices.ts:72-90`).
  No slice has a CLI yet, so this is the first one, and `tests/tools/generate/` shows the launcher on a fixture.
- The domain of P02 in `src/plugins/dotclaude/slices/spec/domain/`: `parseSpec`, `parseDelta` (`parse.ts`), `parseTasks`, `parsePackage` (`plan.ts`), `validateSpec`, `validateDelta`, `validateTasks`, `validatePackage`, `validateDeps`, `validateWave` (`validate.ts`), and `applyDelta` (`delta.ts`).
- The store types and reader: `src/kernel/spec-store.ts` (`SPEC_SCHEMA`, `SPEC_ROOT`, `LANES`, `statePath`, `readState`, `activeProgress`), and the async `FileReader` port: `src/kernel/ports.ts:21-24`, with its adapter in `src/kernel/node/fs.ts`.
  Only the `spec` slice writes the store, so the writer is `adapters/store.ts`.
- The change: `spec/changes/1.0.0/`, with `packages.md` (the list of packages with checkboxes and waves) and `packages/*.md` (one brief for each package that has one).

## Steps

1. Write `slice.ts`, `limits.ts`, `adapters/store.ts`, `adapters/cli.ts`, and the templates of `new` for each size.
2. Write the commands `new`, `status`, `next`, `lane`, `validate`, `archive`, and `record` of `workflow.md:63-72`.
   - `lane` stops with a message in a linked git worktree (`workflow.md:48-49`).
   - `archive` applies the deltas to a temporary copy of `spec/specs/`, and changes nothing when one delta fails.
   - `status` prints numbers and icons, with no bar.
   - Each command that reads `state.json` stops with a message on a `schema` that it does not know.
3. Write the tests in `tests/dotclaude/spec/cli/`, on fixture stores in a temporary folder: each command, a pass and a failure, `lane` in a linked worktree, and `archive` with one failing delta.
4. Write `spec/changes/1.0.0/state.json`: the lane `done` for each package that `packages.md` marks `[x]`, `doing` for each package of wave 2, and `planned` for the others.
5. Run `just generate`, then `plugins/dotclaude/bin/dotclaude-spec validate 1.0.0`.
   When it finds an error in a brief of `packages/`, report the error, and do not change the brief.
6. Run `just test tests/dotclaude/spec`, `just lab`, and `just check`.

## Acceptance

- `just test tests/dotclaude/spec`, `just lab`, and `just check` pass.
- `dotclaude-spec validate 1.0.0` passes, or your report lists each error that it finds in a brief.
- `dotclaude-spec status 1.0.0` prints the lanes of `state.json`.
- No file of the slice imports from `plugins/`, `tools/`, or `tests/`, and no file in `domain/` changed.

## Boundaries

- Change only the paths of `owns`.
- Do not change `domain/` (P02) or write the skills `/spec`, `/hotfix`, and `/ship` (P04).
- Do not change `src/kernel/` or `tools/generate/`.
  When the generator cannot write the launcher, name the gap in your report.
- `biome.json` has lines that exempt the 0.28.0 paths of `tools/rebuild-pending.txt` from lint rules, and `tests/support/rebuild-list.test.ts` checks that each one is on the list.
  Remove the lines of your 0.28.0 paths when you remove their lines in the list.
- Run `just generate`, and commit the generated `plugins/` with your work.
- Use arrow functions, and add no legacy shim, no alias of an old name, and no fallback for an old layout.
- Each file has 300 lines or less, and each test file has 500 lines or less.
- Commit on the branch of your worktree after each step that passes its tests, with the subject `dotclaude 1.0.0: P03 <summary>`.
  Before you reach your turn bound, report the steps that are done and the steps that are open.
