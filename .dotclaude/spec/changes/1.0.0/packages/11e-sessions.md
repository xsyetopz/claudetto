---
schema: dotclaude-spec/2
kind: package
id: P11e
title: `dotclaude-sessions`
wave: 2
deps: ["P01b4"]
owns: ["src/plugins/dotclaude-sessions/","tests/sessions/"]
satisfies: []
verify: just test tests/sessions && just check
agent: implementer
status: done
---

# P11e `dotclaude-sessions`

## Goal

Port the add-on `dotclaude-sessions` to two slices, `usage` and `start-cost`, each with a CLI and a user-invoked skill: `/usage` and `/start-cost`.
The add-on works with no other plugin installed.

## Context

- Your worktree has no git-ignored file.
  Before a check, run `bun install` in the worktree, and copy each git-ignored types folder of the main checkout `/Users/krystian/CodeProjects/xsyetopz/dotclaude` to the same path in the worktree: `.claude-plugin/types/` and `plugins/*/.claude-plugin/types/`.
  The type check reads them.
- Your worktree can start at an old commit.
  First run `git merge-base --is-ancestor 8642933e HEAD`, and when it fails, run `git merge --ff-only dotclaude-1-0-0`, or `git rebase dotclaude-1-0-0` when you have commits.
- The rules of the wave: `.dotclaude/spec/changes/1.0.0/packages.md:7-15`, and the add-ons: `packages.md:103,109`.
- The plugin: `.dotclaude/spec/changes/1.0.0/design.md:14,17,19`, and the files: `.dotclaude/spec/changes/1.0.0/tree.md:182-184`.
  A command is a skill with `disable-model-invocation: true` (`design.md:17`), and the 0.28.0 skills do not have it.
- The slice contract: `src/kernel/slice.ts` (the fields `cli` and `skills`), and the manifest rules: `.dotclaude/spec/changes/1.0.0/design.md:96-133`.
- The source tree of a slice: `.dotclaude/spec/changes/1.0.0/design.md:53-72`, and the code conventions: `.dotclaude/spec/changes/1.0.0/design.md:143-150`.
- The generator finds a plugin from `src/plugins/<p>/plugin.ts` (`tools/generate/discover.ts:61-84`), writes `bin/<bin>` from `adapters/cli.ts` (`tools/generate/emit/slices.ts:72-90`), copies the skills of a slice (`:52-57`), and copies the kernel closure to `plugins/<p>/kernel/`.
  `src/kernel/node/` has `fs`, `paths`, `process`, `stdin`, and `tail` for a CLI.
- The 0.28.0 add-on:
  - `plugins/dotclaude-sessions/features/usage/report.ts` (294 lines), `features/start/cli.ts` (257), `lib/transcript.ts` (162), and `lib/errors.ts`, with the launchers `bin/dotclaude-usage` and `bin/dotclaude-start`.
  - The skill sources `src/plugins/dotclaude-sessions/skills/usage/SKILL.md` and `start-cost/SKILL.md`, and the tests in `tests/sessions/`.
  - Other docs and packages call the CLIs `dotclaude-usage` and `dotclaude-start`, so the names stay.
- The rebuild list: `tools/rebuild-pending.txt:62-65`.

## Steps

1. Write `plugin.ts` from `plugins/dotclaude-sessions/.claude-plugin/plugin.json`.
2. Write `slices/usage/` and `slices/start-cost/`: `slice.ts`, `domain/`, `adapters/cli.ts`, and the skill, with `disable-model-invocation: true`, and the same behavior as 0.28.0.
   Code that both slices need, such as the transcript reader, goes in the domain of one slice, or in a copy in each, because a slice imports only `src/kernel/` and its own folder.
   Name the choice in your report.
3. Move the tests to `tests/sessions/`, and keep each case of the 0.28.0 tests.
4. Remove each hand-written file of `plugins/dotclaude-sessions/` and its lines in `tools/rebuild-pending.txt`, so that `plugins/dotclaude-sessions/` holds only generator output.
5. Run `just generate` and `just check`.

## Acceptance

- `just test tests/sessions` and `just check` pass.
- `claude plugin validate --strict plugins/dotclaude-sessions` passes, and `plugins/dotclaude-sessions/bin/` has `dotclaude-usage` and `dotclaude-start`.
- The description of `plugin.ts` and of the entry in `.claude-plugin/marketplace.json` are the same.
- No file of the add-on imports another plugin, `tools/`, or `tests/`.

## Boundaries

- Change only the paths of `owns`, `plugins/dotclaude-sessions/`, the lines of `tools/rebuild-pending.txt:62-65`, and the `dotclaude-sessions` entry of `.claude-plugin/marketplace.json`.
  Other packages of the wave change other entries of that file, and the main session resolves the merge.
- Do not change `src/kernel/` or `tools/generate/`.
  When the generator cannot write a part of the add-on, name the gap in your report.
- Write the skill texts in strict ASD-STE100, with semantic line breaks.
- `biome.json` has lines that exempt the 0.28.0 paths of `tools/rebuild-pending.txt` from lint rules, and `tests/support/rebuild-list.test.ts` checks that each one is on the list.
  Remove the lines of your 0.28.0 paths when you remove their lines in the list.
- Run `just generate`, and commit the generated `plugins/` with your work.
- Use arrow functions, and add no legacy shim, no alias of an old name, and no fallback for an old layout.
- Each file has 300 lines or less, and each test file has 500 lines or less.
- Commit on the branch of your worktree after each step that passes its tests, with the subject `dotclaude 1.0.0: P11e <summary>`.
  Before you reach your turn bound, report the steps that are done and the steps that are open.
