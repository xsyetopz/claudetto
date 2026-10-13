---
schema: dotclaude-spec/2
kind: package
id: P11d
title: `dotclaude-docs`
wave: 2
deps: ["P01b4"]
owns: ["src/plugins/dotclaude-docs/","tests/docs/"]
satisfies: []
verify: just test tests/docs && just check
agent: implementer
status: done
---

## Goal

Port the add-on `dotclaude-docs` to one slice `docs` with the skill `docs`, which gets the docs of a library from Context7 with `ctx7`.
The add-on works with no other plugin installed.

## Context

- Your worktree has no git-ignored file.
  Before a check, run `bun install` in the worktree, and copy each git-ignored types folder of the main checkout `/Users/krystian/CodeProjects/xsyetopz/dotclaude` to the same path in the worktree: `.claude-plugin/types/` and `plugins/*/.claude-plugin/types/`.
  The type check reads them.
- The rules of the wave: `.dotclaude/spec/changes/1.0.0/packages.md:7-15`, and the add-ons: `packages.md:102,109`.
- The plugin: `.dotclaude/spec/changes/1.0.0/design.md:13,19`, and the files: `.dotclaude/spec/changes/1.0.0/tree.md:179-180`.
- The slice contract: `src/kernel/slice.ts` (the field `skills`), and the generator finds a plugin from `src/plugins/<p>/plugin.ts` (`tools/generate/discover.ts:61-84`) and copies the skills of a slice (`tools/generate/emit/slices.ts:52-57`).
- The 0.28.0 add-on: the skill source `src/plugins/dotclaude-docs/skills/docs/SKILL.md` (43 lines, `allowed-tools` at `:5`), the hand-written `plugins/dotclaude-docs/.claude-plugin/plugin.json`, and the tests in `tests/docs/`.
- The rebuild list: `tools/rebuild-pending.txt:57-60`.

## Steps

1. Write `plugin.ts` from `plugins/dotclaude-docs/.claude-plugin/plugin.json`, and `slices/docs/slice.ts` with `skills/docs/SKILL.md`.
2. Move the tests of the add-on to `tests/docs/`, with each case of 0.28.0 that checks behavior, and no test of the words of the skill.
3. Remove each hand-written file of `plugins/dotclaude-docs/` and its lines in `tools/rebuild-pending.txt`, so that `plugins/dotclaude-docs/` holds only generator output.
4. Run `just generate` and `just check`.

## Acceptance

- `just test tests/docs` and `just check` pass.
- `claude plugin validate --strict plugins/dotclaude-docs` passes.
- The description of `plugin.ts` and of the entry in `.claude-plugin/marketplace.json` are the same.

## Boundaries

- Change only the paths of `owns`, `plugins/dotclaude-docs/`, the lines of `tools/rebuild-pending.txt:57-60`, and the `dotclaude-docs` entry of `.claude-plugin/marketplace.json`.
  Other packages of the wave change other entries of that file, and the main session resolves the merge.
- Do not change `src/kernel/` or `tools/generate/`.
  When the generator cannot write a part of the add-on, name the gap in your report.
- Run `just generate`, and commit the generated `plugins/` with your work.
- Commit on the branch of your worktree after each step that passes its checks, with the subject `dotclaude 1.0.0: P11d <summary>`.
  Before you reach your turn bound, report the steps that are done and the steps that are open.
