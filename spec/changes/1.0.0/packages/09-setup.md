---
id: P09
deps: [P01b4]
owns: ["src/plugins/dotclaude/slices/setup/", "tests/dotclaude/setup/"]
verify: just test tests/dotclaude/setup && just lab && just check
agent: implementer
---

# P09 `setup`

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
- The rules of the wave: `spec/changes/1.0.0/packages.md:7-15`, and this package: `packages.md:81-84`.
- The slice contract: `src/kernel/slice.ts` (the fields `cli` and `skills`), and the manifest rules: `spec/changes/1.0.0/design.md:96-133`.
- The source tree of a slice: `spec/changes/1.0.0/design.md:53-72`, and the code conventions: `spec/changes/1.0.0/design.md:143-150`.
- What a test checks: `spec/changes/1.0.0/design.md:160-172`.
- A user-invoked skill has `disable-model-invocation: true` (`spec/changes/1.0.0/design.md:17`).
- The files: `spec/changes/1.0.0/tree.md:156-160`, and the drift check as a part of `setup`: `spec/changes/1.0.0/workflow.md:149-150`.
- The generator writes `bin/<bin>` from `adapters/cli.ts` (`tools/generate/emit/slices.ts:72-90`), and the skills of a slice (`:52-57`).
- The snippet: a text module folder of the slice, such as `snippet.ts/snippet.json` with the line `{{include snippet.json}}`, gives the module `snippet.ts` with the export `SNIPPET`, the generated snippet of the core plugin (`tests/tools/generate/snippet.test.ts`, the last test).
  Read the snippet only this way, and not from `plugins/dotclaude/lib/`, which P13 deletes.
- A run of P09 before found that Claude Code 2.1.296 writes the `# claude-code-runtime` list to `.git/info/exclude` itself: the marker at `external/cc-2.1.296/strings.txt:139000`, and the writer function `Ce` at `strings.txt:355955`, with the once-for-each-path claim `claude_runtime_exclude_ensured`.
  The trigger of `Ce` is not confirmed.
- The 0.28.0 code:
  - `plugins/dotclaude/features/setup/` (434 lines) and `plugins/dotclaude/features/drift/` (331 lines).
  - The skill `src/plugins/dotclaude/skills/setup/SKILL.md`, and its scripts in `plugins/dotclaude/skills/setup/scripts/` (`settings.ts`, `openspec.ts`, `addons.ts`).
  - The OpenSpec code that goes: `features/setup/openspec.ts`, `SKILL.md:44-59,77,86`, and `scripts/openspec.ts`.
  - The drift handler: `plugins/dotclaude/hooks/legacy.ts:30` (import), `:135-136` (`session.start`), and `:10` (header line).
  - The drift check reads `statusLine.command` (`features/drift/rules.ts:24,50`), and `plugins/dotclaude/lib/merge.ts:17,20` has `STATUS_LINES`.
  - The tests: `tests/dotclaude/setup/`, `tests/dotclaude/drift.test.ts`, `tests/dotclaude/skills.test.ts`, and the hook lab test `plugins/dotclaude/tests/drift.test.ts`.
  - The eval entry: `plugins/dotclaude/evals/hooks.json`, the key `session.start drift`.
- The runtime paths of `.claude/`: `external/cc-2.1.296/strings.txt:138990-139000` in the main checkout, a list of `**/.claude/...` paths that includes `**/.claude/worktrees/`, under the line `# claude-code-runtime`.
  The claim of `packages.md:83` that Claude Code writes `**/.claude/settings.local.json` to the global git ignore file is not confirmed in that file.
- The rebuild list: `tools/rebuild-pending.txt:32-40`.

## Steps

1. Find in the bundle `external/cc-2.1.296/` when Claude Code writes the `# claude-code-runtime` list and where it writes it, and give the `file:line` in your report.
   When Claude Code writes that list itself in each case where dotclaude runs, skip step 3, and report it.
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
