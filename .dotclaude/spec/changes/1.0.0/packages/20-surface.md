---
schema: dotclaude-spec/2
kind: package
id: P20
title: `surface`
wave: 2
deps: ["P01c"]
owns: ["src/plugins/dotclaude/slices/surface/","tests/dotclaude/surface/"]
satisfies: []
verify: just test tests/dotclaude/surface && just lab && just check
agent: implementer
status: done
---

## Goal

Port the 0.28.0 feature `surface` to the slice `surface`, as one transform for each tool description, agent listing, and reminder that it changes.
Each transform is keyed by the id of its built-in text and edits that text, so the slice ships no copy of a built-in text (`.dotclaude/spec/changes/1.0.0/change.md:73-75`).

## Context

- Your worktree has no git-ignored file.
  Before a check, run `bun install` in the worktree, and copy each git-ignored types folder of the main checkout `/Users/krystian/CodeProjects/xsyetopz/dotclaude` to the same path in the worktree: `.claude-plugin/types/` and `plugins/*/.claude-plugin/types/`.
  The type check reads them.
  `external/` is git-ignored too, so read it in the main checkout.
- Your worktree can start at an old commit.
  First run `git merge-base --is-ancestor 8642933e HEAD`, and when it fails, run `git merge --ff-only dotclaude-1-0-0`, or `git rebase dotclaude-1-0-0` when you have commits.
- The rules of the wave: `.dotclaude/spec/changes/1.0.0/packages.md:7-15`.
- The goal of the prompt slices: `.dotclaude/spec/changes/1.0.0/change.md:12-17`.
- The files: `.dotclaude/spec/changes/1.0.0/tree.md:108-112`.
- The slice contract: `src/kernel/slice.ts`, and the manifest rules: `.dotclaude/spec/changes/1.0.0/design.md:96-133`.
- The source tree of a slice: `.dotclaude/spec/changes/1.0.0/design.md:53-72`, and the code conventions: `.dotclaude/spec/changes/1.0.0/design.md:143-150`.
- The test that each transform finds its text: `.dotclaude/spec/changes/1.0.0/design.md:171`.
- The extract: `.dotclaude/spec/changes/1.0.0/evidence/extract.md`, with the texts in `external/cc-extract/2.1.296/` of the main checkout.
  The captures confirm the tool descriptions of `Agent`, `Bash`, `Read`, and `ListAgents` (`extract.md:117`).
  The listings are not confirmed (`extract.md:141-143`), and the captures record no attachment (`extract.md:58,220`).
  Do not use a text that the report marks as not confirmed (`extract.md:222-226`).
- The 0.28.0 code:
  - `plugins/dotclaude/features/surface/`: `data.ts` (48 lines, `DROPPED_AGENTS` at `:30`, `DEFERRED_TOOLS` at `:38`, `TOOL_TEXT` at `:44-48`), `rules.ts` (87 lines, the attachment rules at `:38-50`), and `texts.ts` (70 lines), with the text sources in `src/plugins/dotclaude/features/surface/`.
  - `plugins/dotclaude/hooks/legacy.ts:44-49` (imports), `:137-156` (`prompt.attachment`, `agent.offer`, `tool.describe`), and `:9` (header line).
  - The hook lab test `plugins/dotclaude/tests/surface.test.ts`.
  - `tests/dotclaude/deferred-tools.test.ts:43-52` tests `toolAnswer`, and P21 owns the rest of that file.
  - The eval entries: `plugins/dotclaude/evals/hooks.json`, the keys `prompt.attachment surface`, `agent.offer surface`, and `tool.describe surface`.
- The rebuild list: `tools/rebuild-pending.txt:110-113`.

## Steps

1. Write `slice.ts`, `domain/tools.ts`, `domain/agents.ts`, `domain/reminders.ts`, one file in `transforms/` for each tool or text id, and `adapters/mod.ts`.
   Keep the behavior of 0.28.0, and keep each tool that 0.28.0 defers deferred: no rule sets `isDeferred` to `false`.
   An attachment rule of 0.28.0 stays as it is, because no capture confirms an attachment text.
2. Write the tests in `tests/dotclaude/surface/`: the test of `deferred-tools.test.ts:43-52`, a case for each transform, and a test that each transform of a confirmed text finds its text in the extract.
   The test of the extract reads `external/cc-extract/2.1.296/`, which CI does not have.
   Report how it behaves with no `external/`, and add no skip, because the main session decides that case.
3. Move the hook lab test to `slices/surface/lab/`, and change the eval entries of `surface` to the new slice and lab test.
4. In `legacy.ts`, remove the handlers, the imports, and the header line of `surface`.
5. Delete `tests/dotclaude/deferred-tools.test.ts`, because P21 moves the other tests of that file at the same time, and git merges two deletions of one file.
6. Remove the 0.28.0 files and their lines in `tools/rebuild-pending.txt`.
7. Run `just generate`, `just lab`, and `just check`.

## Acceptance

- `just test tests/dotclaude/surface`, `just lab`, and `just check` pass.
- Each case of the 0.28.0 tests has a case in the new tests with the same answer.
- `grep -rn "features/surface" src tests tools plugins` finds nothing.
- No file of the slice imports from `plugins/`, `tools/`, or `tests/`.

## Boundaries

- Change only the paths of `owns`, the 0.28.0 paths of `tools/rebuild-pending.txt:110-113` and those lines, `tests/dotclaude/deferred-tools.test.ts` (delete only), and these shared files, each only in the parts of your capability:
  - `plugins/dotclaude/hooks/legacy.ts`
  - `plugins/dotclaude/evals/hooks.json`
  - the sentences of `description` in `src/plugins/dotclaude/hooks/hooks.json`
  Other packages of the wave change other parts of these files, and the main session resolves the merge.
- Do not change `src/kernel/` or `tools/generate/`.
- Do not change the settings of `prompt/slice.ts`, or an env switch (P21).
- Write each text that goes to Claude in strict ASD-STE100, with no forceful words.
- `biome.json` has lines that exempt the 0.28.0 paths of `tools/rebuild-pending.txt` from lint rules, and `tests/support/rebuild-list.test.ts` checks that each one is on the list.
  Remove the lines of your 0.28.0 paths when you remove their lines in the list.
- Run `just generate`, and commit the generated `plugins/` with your work.
- Use arrow functions, and add no legacy shim, no alias of an old name, and no fallback for an old layout.
- Each file has 300 lines or less, and each test file has 500 lines or less.
- Commit on the branch of your worktree after each step that passes its tests, with the subject `dotclaude 1.0.0: P20 <summary>`.
  Before you reach your turn bound, report the steps that are done and the steps that are open.
