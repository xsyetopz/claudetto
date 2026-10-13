---
schema: dotclaude-spec/2
kind: package
id: P23
title: `prompt` transforms
wave: 2
deps: ["P01c"]
owns: ["src/plugins/dotclaude/slices/prompt/transforms/","src/plugins/dotclaude/slices/prompt/domain/","src/plugins/dotclaude/slices/prompt/adapters/","src/plugins/dotclaude/slices/prompt/lab/","tests/dotclaude/prompt/"]
satisfies: []
verify: just test tests/dotclaude/prompt && just lab && just check
agent: implementer
status: done
---

# P23 `prompt` transforms

## Goal

Give the `prompt` slice one transform for each confirmed built-in section of the system prompt of Claude Code 2.1.296.
A transform is keyed by the id of its section and edits the built-in text to a shorter text that keeps the facts that the model needs, so the slice ships no copy of a built-in text (`.dotclaude/spec/changes/1.0.0/change.md:73-75`).

## Context

- Your worktree has no git-ignored file.
  Before a check, run `bun install` in the worktree, and copy each git-ignored types folder of the main checkout `/Users/krystian/CodeProjects/xsyetopz/dotclaude` to the same path in the worktree: `.claude-plugin/types/` and `plugins/*/.claude-plugin/types/`.
  The type check reads them.
  `external/` is git-ignored too, so read it in the main checkout.
- Your worktree can start at an old commit.
  First run `git merge-base --is-ancestor 8642933e HEAD`, and when it fails, run `git merge --ff-only dotclaude-1-0-0`, or `git rebase dotclaude-1-0-0` when you have commits.
- The rules of the wave: `.dotclaude/spec/changes/1.0.0/packages.md:7-15`.
- The goal of the prompt slices: `.dotclaude/spec/changes/1.0.0/change.md:12-17`, and the files: `.dotclaude/spec/changes/1.0.0/tree.md:102-107`.
- The test that each transform finds its section: `.dotclaude/spec/changes/1.0.0/design.md:171`.
- The extract: `.dotclaude/spec/changes/1.0.0/evidence/extract.md`.
  The confirmed section ids are at `extract.md:77-94`: `action_caution`, `actions`, `communication`, `context_management`, `doing_tasks`, `env_info_simple`, `intro`, `lean_body`, `memory`, `pronouns`, `session_guidance`, `system`, `tone`, `tools`, and `total_tokens`.
  Their texts are in `external/cc-extract/2.1.296/section/` of the main checkout.
  Do not use a section that the report marks as not confirmed (`extract.md:222-226`).
- The slice now:
  - `domain/apply.ts:13-21` lists seven ids, and `composeSections` (`apply.ts:38`) replaces them with the sections of the variant of the model (`domain/variants.ts`).
  - `adapters/mod.ts:14-22` (`onCompose`), and `onContextSection` at `adapters/mod.ts:34-43` answers `context_management` through the filter of `slice.ts:12-17`.
- The code conventions: `.dotclaude/spec/changes/1.0.0/design.md:143-150`.

## Steps

1. Write one file in `transforms/` for each confirmed section id: a pure function from the built-in text to the new text, which finds each part that it changes by an anchor in the built-in text.
2. Change `domain/apply.ts` to apply the transform of each section, and keep the variant of each model.
   When a variant and a transform change one section, give the order in a comment and in your report.
3. Write the tests in `tests/dotclaude/prompt/`: a case for each transform, and a test that each transform finds each of its anchors in the extracted section.
   The test of the extract reads `external/cc-extract/2.1.296/`, which CI does not have.
   Report how it behaves with no `external/`, and add no skip, because the main session decides that case.
4. Run `just generate`, `just lab`, and `just check`.

## Acceptance

- `just test tests/dotclaude/prompt`, `just lab`, and `just check` pass.
- Each confirmed section id has one transform, and each transform finds its anchors in the extract.
- No file of `transforms/` holds the full text of a built-in section.
- No file of the slice imports from `plugins/`, `tools/`, or `tests/`.

## Boundaries

- Change only the paths of `owns`.
- In `src/plugins/dotclaude/slices/prompt/slice.ts`, change only the `mod` list, and do not change `settings`, because P08 and P21 move keys out of it at the same time.
- Do not change `src/kernel/` or `tools/generate/`.
- Write each text that goes to Claude in strict ASD-STE100, with no forceful words.
- `biome.json` has lines that exempt the 0.28.0 paths of `tools/rebuild-pending.txt` from lint rules, and `tests/support/rebuild-list.test.ts` checks that each one is on the list.
  Remove the lines of your 0.28.0 paths when you remove their lines in the list.
- Run `just generate`, and commit the generated `plugins/` with your work.
- Use arrow functions, and add no legacy shim, no alias of an old name, and no fallback for an old layout.
- Each file has 300 lines or less, and each test file has 500 lines or less.
- Commit on the branch of your worktree after each step that passes its tests, with the subject `dotclaude 1.0.0: P23 <summary>`.
  Before you reach your turn bound, report the steps that are done and the steps that are open.
