---
schema: dotclaude-spec/2
kind: package
id: P12
title: `dotclaude-lab`
wave: 2
deps: ["P01b4"]
owns: ["src/plugins/dotclaude-lab/","tests/lab/","tools/eval-variant.ts","tools/lock.ts","tools/measure.ts","tools/sandbox.ts","tools/start-run.ts","tools/unsandboxed.ts"]
satisfies: []
verify: just test tests/lab && just check
agent: implementer
status: done
---

# P12 `dotclaude-lab`

## Goal

Port the add-on `dotclaude-lab` to four slices, `capture`, `sandbox`, `schema`, and `eval-compare`, each with a CLI, and move the code of the owned `tools/` scripts into the slices.
The add-on works alone, because a user debugs a session with it, so it imports no other plugin.
`schema` writes the exact keys and values of `settings.json` and `managed-settings.json` that the pinned binary reads, each with a short description.

## Context

- Your worktree has no git-ignored file.
  Before a check, run `bun install` in the worktree, and copy each git-ignored types folder of the main checkout `/Users/krystian/CodeProjects/xsyetopz/dotclaude` to the same path in the worktree: `.claude-plugin/types/` and `plugins/*/.claude-plugin/types/`.
  The type check reads them.
  `external/` is git-ignored too, so read the bundle in the main checkout.
- Your worktree can start at an old commit.
  First run `git merge-base --is-ancestor 8642933e HEAD`, and when it fails, run `git merge --ff-only dotclaude-1-0-0`, or `git rebase dotclaude-1-0-0` when you have commits.
- The rules of the wave: `.dotclaude/spec/changes/1.0.0/packages.md:7-15`, and this package: `packages.md:104-107,109`.
- The plugin: `.dotclaude/spec/changes/1.0.0/design.md:15,19`, the files: `.dotclaude/spec/changes/1.0.0/tree.md:186-190`, and the schemas: `.dotclaude/spec/changes/1.0.0/workflow.md:135-139` and `tree.md:22-24`.
- The slice contract: `src/kernel/slice.ts` (the fields `cli` and `skills`), and the manifest rules: `.dotclaude/spec/changes/1.0.0/design.md:96-133`.
- The source tree of a slice: `.dotclaude/spec/changes/1.0.0/design.md:53-72`, and the code conventions: `.dotclaude/spec/changes/1.0.0/design.md:143-150`.
- The generator finds a plugin from `src/plugins/<p>/plugin.ts` (`tools/generate/discover.ts:61-84`), writes `bin/<bin>` from `adapters/cli.ts` (`tools/generate/emit/slices.ts:72-90`), copies the skills of a slice (`:52-57`), and copies the kernel closure to `plugins/<p>/kernel/`.
- The 0.28.0 add-on:
  - `plugins/dotclaude-lab/features/` (with `capture/report.ts`, 247 lines, and `schema/scan.ts`, 217 lines), `plugins/dotclaude-lab/lib/run-program.ts`, and the launchers `bin/dotclaude-capture`, `dotclaude-eval-compare`, `dotclaude-sandbox`, and `dotclaude-schema`.
  - The skill source `src/plugins/dotclaude-lab/skills/eval-compare/SKILL.md`, with `disable-model-invocation`, and the tests in `tests/lab/`.
- The owned tools and their users:
  - `tools/eval-variant.ts`: `justfile`, `tests/lab/fixture-repo.ts`, `tests/lab/eval-variant.test.ts`, `tests/lab/results-copy.test.ts`.
  - `tools/lock.ts`: `justfile`, `tests/support/lock.test.ts`.
  - `tools/measure.ts`: `justfile`, `tools/limits.ts`, `tools/start-run.ts`.
  - `tools/sandbox.ts`: `justfile`.
  - `tools/start-run.ts`: `justfile`.
  - `tools/unsandboxed.ts`: `justfile`, `tests/support/unsandboxed.test.ts`.
- `just schema` runs `plugins/dotclaude-lab/bin/dotclaude-schema --out schemas` (`justfile:75-77`).
- `tests/support/settings-pin.ts:7` and `tests/dotclaude/settings-pin.test.ts:15` import the validator `tests/dotclaude/fixtures/validate.ts`, so give them a validator that is not 0.28.0 code before you delete that folder (`tools/rebuild-pending.txt:68`).
- The rebuild list: `tools/rebuild-pending.txt:67-80`.

## Steps

1. Write `plugin.ts` from `plugins/dotclaude-lab/.claude-plugin/plugin.json`.
2. Write the four slices with `slice.ts`, `domain/`, and `adapters/cli.ts`, and the skill of `eval-compare`, with the same behavior as 0.28.0 and the CLI names of 0.28.0.
3. Move the code of each owned `tools/` script into the slice that it belongs to, and change each user of the list above to call the CLI.
   When a script is a repository tool and not a debug tool, keep it in `tools/`, rebuild it, and give the reason in your report.
4. Make `schema` write `schemas/claude-code-settings.json` and `schemas/claude-code-managed-settings.json` from the bundle of 2.1.296, with a description for each key, and add a test that fails on a key in `schemas/` that the binary does not read.
5. Give `settings-pin` its validator, then delete `tests/dotclaude/fixtures/`.
6. Move the tests to `tests/lab/`, and keep each case of the 0.28.0 tests.
7. Remove each hand-written file of `plugins/dotclaude-lab/` and its lines in `tools/rebuild-pending.txt`, so that `plugins/dotclaude-lab/` holds only generator output.
8. Run `just generate`, `just schema`, and `just check`.

## Acceptance

- `just test tests/lab` and `just check` pass.
- `claude plugin validate --strict plugins/dotclaude-lab` passes.
- The test of step 4 fails on a fixture key that the binary does not read.
- The description of `plugin.ts` and of the entry in `.claude-plugin/marketplace.json` are the same.
- No file of the add-on imports another plugin, `tools/`, or `tests/`.

## Boundaries

- Change only the paths of `owns`, `plugins/dotclaude-lab/`, `schemas/`, `tests/dotclaude/fixtures/`, `tests/support/lock.test.ts`, `tests/support/unsandboxed.test.ts`, `tests/support/settings-pin.ts`, `tests/dotclaude/settings-pin.test.ts`, the lines of `tools/rebuild-pending.txt:67-80`, the recipes of `justfile` and the scripts of `package.json` that call the owned tools, the import of `tools/measure.ts` in `tools/limits.ts`, and the `dotclaude-lab` entry of `.claude-plugin/marketplace.json`.
  Other packages of the wave change other entries of `marketplace.json`, and the main session resolves the merge.
- Do not change `src/kernel/` or `tools/generate/`.
  When the generator cannot write a part of the add-on, name the gap in your report.
- `biome.json` has lines that exempt the 0.28.0 paths of `tools/rebuild-pending.txt` from lint rules, and `tests/support/rebuild-list.test.ts` checks that each one is on the list.
  Remove the lines of your 0.28.0 paths when you remove their lines in the list.
- Run `just generate`, and commit the generated `plugins/` with your work.
- Use arrow functions, and add no legacy shim, no alias of an old name, and no fallback for an old layout.
- Each file has 300 lines or less, and each test file has 500 lines or less.
- Commit on the branch of your worktree after each step that passes its tests, with the subject `dotclaude 1.0.0: P12 <summary>`.
  Before you reach your turn bound, report the steps that are done and the steps that are open.
