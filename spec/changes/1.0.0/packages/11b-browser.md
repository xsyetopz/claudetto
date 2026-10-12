---
id: P11b
deps: [P01b4]
owns: ["src/plugins/dotclaude-browser/", "tests/browser/"]
verify: just test tests/browser && just lab && just check
agent: implementer
---

# P11b `dotclaude-browser`

## Goal

Port the add-on `dotclaude-browser` to two slices: `search`, with the mod on `WebSearch`, and `browse`, with the CLI `dotclaude-browser-guide` and the skill `drive-web-browser`.
The add-on works with no other plugin installed.

## Context

- Your worktree has no git-ignored file.
  Before a check, run `bun install` in the worktree, and copy each git-ignored types folder of the main checkout `/Users/krystian/CodeProjects/xsyetopz/dotclaude` to the same path in the worktree: `.claude-plugin/types/` and `plugins/*/.claude-plugin/types/`.
  The type check reads them.
- Your worktree can start at an old commit.
  First run `git merge-base --is-ancestor 8642933e HEAD`, and when it fails, run `git merge --ff-only dotclaude-1-0-0`, or `git rebase dotclaude-1-0-0` when you have commits.
- The rules of the wave: `spec/changes/1.0.0/packages.md:7-15`, and the add-ons: `packages.md:101,109`.
- The plugin: `spec/changes/1.0.0/design.md:11,19`, and the files: `spec/changes/1.0.0/tree.md:175-177`.
- The slice contract: `src/kernel/slice.ts` (the fields `mod`, `cli`, `skills`, and `userConfig`), and the manifest rules: `spec/changes/1.0.0/design.md:96-133`.
- The source tree of a slice: `spec/changes/1.0.0/design.md:53-72`, and the code conventions: `spec/changes/1.0.0/design.md:143-150`.
- A ported slice with mod handlers to use as the model: `src/plugins/dotclaude/slices/prompt/`.
- The generator finds a plugin from `src/plugins/<p>/plugin.ts` (`tools/generate/discover.ts:61-84`), writes `plugin.json` with the `userConfig` of each slice (`tools/generate/emit/manifest.ts:36-61`), writes `hooks/register.ts` from the mod handlers, writes `bin/<bin>` from `adapters/cli.ts` (`tools/generate/emit/slices.ts:72-90`), and copies the kernel closure to `plugins/<p>/kernel/`.
- The mod runtime gives the `userConfig` values to `register(on, options)`.
  A mod handler that reads them has `configure: (options) => hook` in place of `run`, and the generated `register` calls it with `options` (`src/kernel/slice.ts`, `Configure`, and `tests/tools/generate/slices.test.ts`).
- The `browse` slice can have `limits.ts` and `domain/` for the bounds of the guide, although `tree.md:177` does not list them.
- The 0.28.0 add-on:
  - `plugins/dotclaude-browser/features/search/search.ts` (187 lines), `features/guide/guide.ts` (48), and the launcher `bin/dotclaude-browser-guide`.
  - `plugins/dotclaude-browser/hooks/register.ts` (164 lines): `register(on, options)` at `:151`, and `on("tool.call", { tool: "WebSearch" }, ...)` at `:153`.
  - The `userConfig` at `plugins/dotclaude-browser/.claude-plugin/plugin.json:11`.
  - The skill source `src/plugins/dotclaude-browser/skills/drive-web-browser/SKILL.md`, and the tests in `tests/browser/` and `plugins/dotclaude-browser/tests/`.
- The rebuild list: `tools/rebuild-pending.txt:52-55`.

## Steps

1. Write `plugin.ts` from `plugins/dotclaude-browser/.claude-plugin/plugin.json`.
2. Write `slices/search/`: `slice.ts` with the `userConfig`, `limits.ts`, `domain/`, and `adapters/mod.ts`, with the same behavior as 0.28.0.
3. Write `slices/browse/`: `slice.ts`, `adapters/cli.ts`, and `skills/drive-web-browser/SKILL.md`.
4. Write the tests in `tests/browser/` and the hook lab tests in `slices/search/lab/`, and keep each case of the 0.28.0 tests.
5. Remove each hand-written file of `plugins/dotclaude-browser/` and its lines in `tools/rebuild-pending.txt`, so that `plugins/dotclaude-browser/` holds only generator output.
6. Run `just generate`, `just lab`, and `just check`.

## Acceptance

- `just test tests/browser`, `just lab`, and `just check` pass.
- `claude plugin validate --strict plugins/dotclaude-browser` passes, and the generated `plugin.json` has the same `userConfig` as 0.28.0.
- The description of `plugin.ts` and of the entry in `.claude-plugin/marketplace.json` are the same.
- No file of the add-on imports another plugin, `tools/`, or `tests/`.

## Boundaries

- Change only the paths of `owns`, `plugins/dotclaude-browser/`, the lines of `tools/rebuild-pending.txt:52-55`, and the `dotclaude-browser` entry of `.claude-plugin/marketplace.json`.
  Other packages of the wave change other entries of that file, and the main session resolves the merge.
- Do not change `src/kernel/` or `tools/generate/`.
  When the generator cannot write a part of the add-on, name the gap in your report.
- `biome.json` has lines that exempt the 0.28.0 paths of `tools/rebuild-pending.txt` from lint rules, and `tests/support/rebuild-list.test.ts` checks that each one is on the list.
  Remove the lines of your 0.28.0 paths when you remove their lines in the list.
- Run `just generate`, and commit the generated `plugins/` with your work.
- Use arrow functions, and add no legacy shim, no alias of an old name, and no fallback for an old layout.
- Each file has 300 lines or less, and each test file has 500 lines or less.
- Commit on the branch of your worktree after each step that passes its tests, with the subject `dotclaude 1.0.0: P11b <summary>`.
  Before you reach your turn bound, report the steps that are done and the steps that are open.
