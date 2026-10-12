---
id: P07
deps: [P01b4]
owns: ["src/plugins/dotclaude/slices/sembr/", "tests/dotclaude/sembr/"]
verify: just test tests/dotclaude/sembr && just lab && just check
agent: implementer
---

# P07 `sembr`

## Goal

Port the 0.28.0 feature `sembr` to the slice `sembr`, with the same behavior.
`Write` and `Edit` put each sentence of a Markdown file on its own line, `Edit` also splits a cross-sentence `old_string`, and `Bash` does the same for the quoted heredoc of `git commit` and `gh pr create` (design D29).

## Context

- Your worktree has no git-ignored file.
  Before a check, run `bun install` in the worktree, and copy each git-ignored types folder of the main checkout `/Users/krystian/CodeProjects/xsyetopz/dotclaude` to the same path in the worktree: `.claude-plugin/types/` and `plugins/*/.claude-plugin/types/`.
  The type check reads them.
- The rules of the wave: `spec/changes/1.0.0/packages.md:7-15`.
- The slice contract: `src/kernel/slice.ts`, and the manifest rules: `spec/changes/1.0.0/design.md:96-133`.
- The source tree of a slice: `spec/changes/1.0.0/design.md:53-72`, and the code conventions: `spec/changes/1.0.0/design.md:143-150`.
- What a test checks: `spec/changes/1.0.0/design.md:160-172`.
- A ported slice to use as the model: `src/plugins/dotclaude/slices/prompt/`, its tests `tests/dotclaude/prompt/`, and its hook lab tests `src/plugins/dotclaude/slices/prompt/lab/`.
- The files of `sembr`: `spec/changes/1.0.0/tree.md:128-131`.
  The tree names `Write` and `Edit`, and the slice also has the `Bash` handler of 0.28.0.
- The 0.28.0 code:
  - `plugins/dotclaude/features/sembr/rules.ts` (167 lines).
  - `plugins/dotclaude/lib/sembr.ts` (249 lines), which has no kernel copy, so it moves to `domain/`.
  - `plugins/dotclaude/lib/text.ts` is the same as `src/kernel/text.ts`.
  - `plugins/dotclaude/hooks/legacy.ts:39-43` (imports), and `:170-185` (the handlers on `Write`, `Edit`, and `Bash`).
  - The tests: `tests/dotclaude/sembr/` (3 files), and the hook lab test `plugins/dotclaude/tests/sembr.test.ts`.
  - The eval entries: `plugins/dotclaude/evals/hooks.json`, the keys `tool.call Write sembr`, `tool.call Edit sembr`, and `tool.call Bash sembr`.
- The `guard` slice (P05) has a `tool.call` handler on `Bash` in the phase `check`, and the deny of a denied call must run before the rewrite (`legacy.ts:157-158`).
  Give the `sembr` handlers the phase `rewrite`, and check in `tools/generate/order.ts` that the order of the phases puts the deny first.
  When it does not, name the gap in your report, and do not change the generator.

## Steps

1. Write `slice.ts`, `domain/rewrite.ts` and the other domain files, and `adapters/mod.ts`.
2. Move the tests to `tests/dotclaude/sembr/`, and the hook lab test to `slices/sembr/lab/`.
3. In `legacy.ts`, remove the handlers, the imports, and the header lines of `sembr`.
4. Change the eval entries of `sembr` to the new slice and lab test.
5. Remove the 0.28.0 files and their lines in `tools/rebuild-pending.txt`, and `plugins/dotclaude/lib/sembr.ts` when no other file imports it.
6. Run `just generate`, `just lab`, and `just check`.

## Acceptance

- `just test tests/dotclaude/sembr`, `just lab`, and `just check` pass.
- Each case of the 0.28.0 tests has a case in the new tests with the same output.
- `grep -rn "features/sembr" src tests tools plugins` finds nothing.
- No file of the slice imports from `plugins/`, `tools/`, or `tests/`.

## Boundaries

- Change only the paths of `owns`, the 0.28.0 paths of `tools/rebuild-pending.txt:23-26` and those lines, `plugins/dotclaude/lib/sembr.ts`, and these shared files, each only in the parts of your capability:
  - `plugins/dotclaude/hooks/legacy.ts`
  - `plugins/dotclaude/evals/hooks.json`
  - the sentences of `description` in `src/plugins/dotclaude/hooks/hooks.json`
  Other packages of the wave change other parts of these files, and the main session resolves the merge.
- Do not change `src/kernel/` or `tools/generate/`.
- Do not change the behavior of a rewrite.
- Run `just generate`, and commit the generated `plugins/` with your work.
- Use arrow functions, and add no legacy shim, no alias of an old name, and no fallback for an old layout.
- Each file has 300 lines or less, and each test file has 500 lines or less.
- Commit on the branch of your worktree after each step that passes its tests, with the subject `dotclaude 1.0.0: P07 <summary>`.
  Before you reach your turn bound, report the steps that are done and the steps that are open.
