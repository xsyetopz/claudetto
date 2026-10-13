---
schema: dotclaude-spec/2
kind: package
id: P09
title: `setup`
wave: 2
deps: ["P01b4"]
owns: ["src/plugins/dotclaude/slices/setup/","tests/dotclaude/setup/"]
satisfies: []
verify: just test tests/dotclaude/setup && just lab && just check
agent: implementer
status: done
---

## Goal

Port the 0.28.0 setup and drift check to the slice `setup`: the user-invoked skill `/setup`, the CLI `dotclaude-setup`, and the drift check.
The new setup has no OpenSpec step.
When dotclaude runs in a git repository, it adds each runtime path of `.claude/` that git does not ignore to `.git/info/exclude` (the user, 2026-10-12).

## Context

- Your worktree has no git-ignored file.
  Before a check, run `bun install` in the worktree, and copy each git-ignored types folder of the main checkout `/Users/krystian/CodeProjects/xsyetopz/dotclaude` to the same path in the worktree: `.claude-plugin/types/` and `plugins/*/.claude-plugin/types/`.
  The type check reads them.
  `external/` is git-ignored too, so read it in the main checkout.
- Your worktree can start at an old commit.
  First run `git merge-base --is-ancestor 8642933e HEAD`, and when it fails, run `git merge --ff-only dotclaude-1-0-0`, or `git rebase dotclaude-1-0-0` when you have commits.
- The rules of the wave: `.dotclaude/spec/changes/1.0.0/packages.md:7-15`, and this package: `packages.md:81-84`.
- The slice contract: `src/kernel/slice.ts` (the fields `cli` and `skills`), and the manifest rules: `.dotclaude/spec/changes/1.0.0/design.md:96-133`.
- The source tree of a slice: `.dotclaude/spec/changes/1.0.0/design.md:53-72`, and the code conventions: `.dotclaude/spec/changes/1.0.0/design.md:143-150`.
- What a test checks: `.dotclaude/spec/changes/1.0.0/design.md:160-172`.
- A user-invoked skill has `disable-model-invocation: true` (`.dotclaude/spec/changes/1.0.0/design.md:17`).
- The files: `.dotclaude/spec/changes/1.0.0/tree.md:156-160`, and the drift check as a part of `setup`: `.dotclaude/spec/changes/1.0.0/workflow.md:149-150`.
- The generator writes `bin/<bin>` from `adapters/cli.ts` (`tools/generate/emit/slices.ts:72-90`), and the skills of a slice (`:52-57`).
- The snippet: a text module folder of the slice, such as `snippet.ts/snippet.json` with the line `{{include snippet.json}}`, gives the module `snippet.ts` with the export `SNIPPET`, the generated snippet of the core plugin (`tests/tools/generate/snippet.test.ts`, the last test).
  Read the snippet only this way, and not from `plugins/dotclaude/lib/`, which P13 deletes.
- Step 1 is done (run 2 of P09): Claude Code 2.1.296 writes the `# claude-code-runtime` list of 10 paths (`external/cc-2.1.296/strings.txt:138990-139000`) to `.git/info/exclude` itself, with the writer `Ce` at `strings.txt:355955`.
  Its only trigger is the start of the cron scheduler (`de` at `strings.txt:355957`, created at `:351626`), and the snippet sets `CLAUDE_CODE_DISABLE_CRON`, so step 3 is needed.
  The list has no `**/.claude/settings.local.json`.
- Decisions of the main session for this package:
  - The skill moves to `slices/setup/skills/setup/SKILL.md`.
  - The snippet route: `slices/setup/texts.ts/snippet.json` with `{{include snippet.json}}`, and `texts.ts/docs-snippet.json` with `{{include docs-snippet.json}}`.
  - The merge code goes to `domain/merge.ts`, the drift check to `domain/drift.ts` and `adapters/mod.ts`, and the CLI runs programs with `runProgram` of `src/kernel/node/process.ts`.
  - The CLI runs the exclude step on each run, because no event of Claude Code gives a better time.
  - The drift check keeps its match of the `features/statusline/` path until P08 merges, and the main session changes it after the merge.
  - Write each message of the drift check that goes to Claude in strict ASD-STE100.
  - Delete `tests/dotclaude/skills.test.ts` only when each of its cases tests the `setup` skill, and move a case that tests another skill to the tests of that skill.
- The rebuild list: `tools/rebuild-pending.txt:32-40`.

## Steps

1. Step 1 is done: see Context.
2. Write `slice.ts`, `domain/merge.ts`, `domain/drift.ts`, `domain/addons.ts`, `adapters/cli.ts`, and `skills/setup/SKILL.md`.
   The CLI previews and applies the settings snippet, checks the tools of the installed add-ons, and checks drift.
   The drift check keeps the behavior of 0.28.0 except the OpenSpec parts, and it reads the `statusLine` command of the snippet that `just generate` writes.
   When the drift check needs a `session.start` handler, put it in `adapters/mod.ts`, and remove the handler in `legacy.ts`.
3. Write `domain/exclude.ts`: the runtime paths of `.claude/` that git does not ignore, and the lines to add to `.git/info/exclude`, as a pure function of the git state, and its adapter step in the CLI.
4. Write the tests in `tests/dotclaude/setup/`: a repository with no rule, one with each rule, a folder that is not a git repository, and each drift case of 0.28.0 except OpenSpec.
5. Remove the 0.28.0 files and their lines in `tools/rebuild-pending.txt`, and the drift lines in `legacy.ts`.
6. Run `just generate`, `just lab`, and `just check`.

## Acceptance

- `just test tests/dotclaude/setup`, `just lab`, and `just check` pass.
- `grep -rni openspec src/plugins/dotclaude/slices/setup tests/dotclaude/setup` finds nothing.
- `grep -rn "features/setup\|features/drift\|skills/setup/scripts" src tests tools plugins` finds nothing.
- No file of the slice imports from `plugins/`, `tools/`, or `tests/`, and no file in `domain/` imports `src/kernel/node/`.

## Boundaries

- Change only the paths of `owns`, the 0.28.0 paths of `tools/rebuild-pending.txt:32-40` and those lines, and these shared files, each only in the parts of your capability:
  - `plugins/dotclaude/hooks/legacy.ts`
  - `plugins/dotclaude/evals/hooks.json`
  - the sentences of `description` in `src/plugins/dotclaude/hooks/hooks.json`
  Other packages of the wave change other parts of these files, and the main session resolves the merge.
- `src/plugins/dotclaude/skills/` and `plugins/dotclaude/skills/` hold only `setup` in 0.28.0.
  Check it before you delete them.
- Do not change `src/kernel/` or `tools/generate/`.
  When the kernel does not have the code that you need from `plugins/dotclaude/lib/`, write it in your slice and name it in your report, because P13 deletes `lib/`.
- Do not change the status line (P08) or the settings of `prompt/slice.ts`.
- Write the skill text in strict ASD-STE100, with semantic line breaks.
- `biome.json` has lines that exempt the 0.28.0 paths of `tools/rebuild-pending.txt` from lint rules, and `tests/support/rebuild-list.test.ts` checks that each one is on the list.
  Remove the lines of your 0.28.0 paths when you remove their lines in the list.
- Run `just generate`, and commit the generated `plugins/` with your work.
- Use arrow functions, and add no legacy shim, no alias of an old name, and no fallback for an old layout.
- Each file has 300 lines or less, and each test file has 500 lines or less.
- Commit on the branch of your worktree after each step that passes its tests, with the subject `dotclaude 1.0.0: P09 <summary>`.
  Before you reach your turn bound, report the steps that are done and the steps that are open.
