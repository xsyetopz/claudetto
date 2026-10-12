---
id: P21
deps: [P01d]
owns: ["src/plugins/dotclaude/slices/trim/", "tests/dotclaude/trim/"]
verify: just test tests/dotclaude/trim && just lab && just check
agent: implementer
---

# P21 `trim`

## Goal

Write the slice `trim`: the settings, env, and mod rules that turn off each built-in part of the inventory that dotclaude does not need.
Move the settings keys that turn off a built-in part from the `prompt` slice to `trim`.

## Context

- Your worktree has no git-ignored file.
  Before a check, run `bun install` in the worktree, and copy each git-ignored types folder of the main checkout `/Users/krystian/CodeProjects/xsyetopz/dotclaude` to the same path in the worktree: `.claude-plugin/types/` and `plugins/*/.claude-plugin/types/`.
  The type check reads them.
- The rules of the wave: `spec/changes/1.0.0/packages.md:7-15`.
- The goal: `spec/changes/1.0.0/change.md:16`, and the files: `spec/changes/1.0.0/tree.md:113-116`.
- The inventory: `spec/changes/1.0.0/evidence/inventory.md`, with the switch rows at `:79-105`.
  No switch has a single measured cost (`inventory.md:60-63`).
- The slice contract: `src/kernel/slice.ts`, and the manifest rules: `spec/changes/1.0.0/design.md:96-133`.
- The settings merge: `tools/generate/emit/snippet.ts:27-49`.
  It fails when two slices set one key to different values, and it allows the same value in two slices.
- The source tree of a slice: `spec/changes/1.0.0/design.md:53-72`, and the code conventions: `spec/changes/1.0.0/design.md:143-150`.
- The settings now: `src/plugins/dotclaude/slices/prompt/slice.ts:19-230`.
- The ban list: `tests/dotclaude/deferred-tools.test.ts:13-41` bans `CLAUDE_CODE_SIMPLE`, `CLAUDE_CODE_DISABLE_ATTACHMENTS`, and `ENABLE_TOOL_SEARCH` with `false`, `0`, or `auto:0`, because each sends every tool schema in full or removes the attachments that the `surface` slice (P20) changes.
  `inventory.md:81` lists `CLAUDE_CODE_DISABLE_ATTACHMENTS` as a candidate, and the ban stays.
  P20 owns `deferred-tools.test.ts:43-52`.
- The 0.28.0 files: `src/plugins/dotclaude/settings.json` and `plugins/dotclaude/settings.json` (each `{}`), and `tests/dotclaude/plugin-settings.test.ts`.
- The rebuild list: `tools/rebuild-pending.txt:115-119`.

## Steps

1. Write `slice.ts` and `domain/removed.ts`: the list of built-in parts that dotclaude removes, each with its switch, from the inventory.
   Add a switch of the inventory only when it does not remove a part that a slice of dotclaude uses, and give the reason of each in a comment of `removed.ts`.
2. Move each settings key and env name that turns off a built-in part from `prompt/slice.ts` to `trim/slice.ts`.
   Keep the other keys in `prompt/slice.ts`, and do not change `statusLine` or `subagentStatusLine` (P08).
3. Write `adapters/mod.ts` only for a part that no setting and no env name can turn off, and that the inventory gives a mod id for.
4. Write the tests in `tests/dotclaude/trim/`: the ban list of `deferred-tools.test.ts:13-41` against the generated snippet and the plugin `settings.json`, and a case for each mod rule.
5. Delete `tests/dotclaude/deferred-tools.test.ts`, because P20 moves the other test of that file at the same time, and git merges two deletions of one file.
6. Remove the 0.28.0 files and their lines in `tools/rebuild-pending.txt`, when no file of the plugin needs `settings.json`.
   When the plugin needs it, keep it in the slice output and say how in your report.
7. Run `just generate`, `just lab`, and `just check`.

## Acceptance

- `just test tests/dotclaude/trim`, `just lab`, and `just check` pass.
- The generated snippet sets no banned env name.
- Each switch in `trim/slice.ts` has an entry in `domain/removed.ts`.
- No file of the slice imports from `plugins/`, `tools/`, or `tests/`.

## Boundaries

- Change only the paths of `owns`, the 0.28.0 paths of `tools/rebuild-pending.txt:115-119` and those lines, `tests/dotclaude/deferred-tools.test.ts` (delete only), and in `src/plugins/dotclaude/slices/prompt/slice.ts` only the keys that you move.
  Other packages of the wave change other keys of that file, and the main session resolves the merge.
- Do not change `src/kernel/` or `tools/generate/`.
- Run `just generate`, and commit the generated `plugins/` with your work.
- Use arrow functions, and add no legacy shim, no alias of an old name, and no fallback for an old layout.
- Each file has 300 lines or less, and each test file has 500 lines or less.
- Commit on the branch of your worktree after each step that passes its tests, with the subject `dotclaude 1.0.0: P21 <summary>`.
  Before you reach your turn bound, report the steps that are done and the steps that are open.
