---
schema: dotclaude-spec/2
kind: package
id: P01b4
title: The checks of the new layout
wave: 1
deps: ["P01b3"]
owns: ["biome.json","tools/lint/","tools/generate/emit/register.ts","tools/validate.ts","tools/limits.ts","tools/lab.ts","tools/recipes.ts","tools/sizes.ts","tests/support/","tests/dotclaude/settings-pin.test.ts","package.json","tsconfig.json","AGENTS.md","GEMINI.md"]
satisfies: []
verify: just check
agent: implementer
status: done
---

# P01b4 The checks of the new layout

## Goal

Add the lint rules and the checks of the 1.0.0 layout to `just check`, change `AGENTS.md` to the new layout, and rebuild the 0.28.0 and 0.29.0 files of the checks.

## Context

- Your worktree has no git-ignored file.
  Before a check, run `bun install` in the worktree, and copy each git-ignored types folder of the main checkout `/Users/krystian/CodeProjects/xsyetopz/dotclaude` to the same path in the worktree: `.claude-plugin/types/` and `plugins/*/.claude-plugin/types/`.
  The type check reads them.
- The code conventions and the lint rules: `.dotclaude/spec/changes/1.0.0/design.md:143-150` and `:160-172`.
- The import rules of a slice: `.dotclaude/spec/changes/1.0.0/design.md:127-128`.
- The bounds: `.dotclaude/spec/changes/1.0.0/design.md:135-141`.
- The 0.28.0 paths that the new rules exempt: `tools/rebuild-pending.txt`.
- The scripts: `package.json` (`lint` runs `bunx biome ci plugins tests tools`, with no `src`), `tsconfig.json` (its `include` has no `src`), and `justfile` (`check`).
- The file-size test: `tests/support/file-size.test.ts`, with the bounds in `tools/limits.ts:7-9`.
- The rules to change: `AGENTS.md:45-53`.
- `checkEntries` in `tests/support/import-rules.ts` checks the imports of a slice until the overrides of step 2 do it.
  P01b2 added that check, and step 2 replaces it.

## Steps

1. Set `useArrowFunction` to `error` in `biome.json`, and add the GritQL plugin `tools/lint/arrow-functions.grit`, which reports a `function` declaration.
2. Add `noRestrictedImports` overrides: a slice imports only `src/kernel/` and its own folder, and `domain/` imports no adapter and no `src/kernel/node/`.
3. Exempt the paths of `tools/rebuild-pending.txt` from the new rules, and from no other rule.
   The generated `register.ts` (`tools/generate/emit/register.ts`) writes `export function register`, the shape of the hand-written modules.
   Change it to `export const register = (on: On): void => {...}`, and keep it only when `just lab` and `claude plugin validate --strict` pass on the generated module.
   When the mod runtime needs the declaration, keep it, exempt only the generated `register.ts` files, and give the reason in a comment of `biome.json`.
   Keep one list of these paths, so that a later package removes a path in one place.
4. Add `src` to the `lint` script and to the `include` of `tsconfig.json`, and add `just generate --check` to the `check` recipe of `justfile`.
5. Move the file-size rule from `tests/support/file-size.test.ts` to `just validate` (`tools/validate.ts`).
6. Change `AGENTS.md` to the new layout and bounds (`src/kernel/budget.ts`, `slices/<s>/limits.ts`, and `tools/limits.ts`) and to the import rules of step 2, in STE-flavored ASD-STE100, with semantic line breaks and no semicolons.
   Add `GEMINI.md` as a symlink to `AGENTS.md`, next to `CLAUDE.md`.
7. Rebuild the files of the P01b4 group of `tools/rebuild-pending.txt`: `tools/lab.ts`, `tools/limits.ts`, `tools/recipes.ts`, `tools/sizes.ts`, `tools/validate.ts`, `tests/support/`, `tests/dotclaude/settings-pin.test.ts`, `tests/dotclaude/fixtures/`, `tests/dotclaude/import-rules.test.ts`, and `tests/dotclaude/imports.test.ts`.
   A rebuilt file follows the 1.0.0 conventions of `design.md`, names the 1.0.0 design and bounds and no 0.28.0 or 0.29.0 task or design number, and keeps the behavior that a 1.0.0 check needs.
   Delete a file that no 1.0.0 check needs, and move a test to the folder of `tree.md` (`tests/support/` or `tests/tools/`).
   Remove the P01b4 group from `tools/rebuild-pending.txt`.
8. Run `just check`.

## Acceptance

- `just check` passes.
- `bunx biome lint` fails on a temporary fixture with a `function` declaration and on one with a `function` expression.
  Show both outputs in your report, and delete the fixtures.
- `just validate` fails on a temporary file of 301 lines, and passes when it is deleted.
- `tools/rebuild-pending.txt` has no P01b4 group, and `grep -rnE "task [0-9]|design D[0-9]" tools tests/support` finds only the paths that the list still names.

## Boundaries

- Change only the paths of `owns`, the `check` recipe of `justfile`, and the P01b4 group of `tools/rebuild-pending.txt`.
- Fix a new lint finding in a file that the rebuild list does not name at its cause, and name each such file in your report.
- Commit on the branch of your worktree after each step that passes its checks, with the subject `dotclaude 1.0.0: P01b4 <summary>`.
  Before you reach your turn bound, report the steps that are done and the steps that are open.
