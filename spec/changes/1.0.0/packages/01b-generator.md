---
id: P01b
deps: [P01a]
owns: ["tools/", "tests/tools/", "tests/support/", "src/fragments/", "src/shared/", "src/plugins/dotclaude/plugin.ts", "src/plugins/dotclaude/slices/prompt/", "tests/dotclaude/prompt/", "AGENTS.md", "GEMINI.md", "biome.json", "justfile", "package.json", "tsconfig.json"]
verify: just check
agent: implementer
---

# P01b Generator

## Goal

Write the generator `tools/generate/`, which makes `plugins/` from the slices in `src/`, and prove it on one real slice: `prompt`.
After this package, each later package adds a slice and runs `just generate`, and no package edits a file in `plugins/` by hand.
Add the lint rules and the checks of the new layout to `just check`.

## Context

- Your worktree has no git-ignored file.
  Before a check, run `bun install` in the worktree, and copy each `.claude-plugin/types/` folder of the main checkout `/Users/krystian/CodeProjects/xsyetopz/dotclaude` to the same path in the worktree, because the type check reads them.
- The architecture, the source tree, the generated tree, and the slice manifest: `spec/changes/1.0.0/design.md:33-133`.
- The rebuild branch and `tools/rebuild-pending.txt`: `spec/changes/1.0.0/design.md:152-158`.
- The checks and where each one runs: `spec/changes/1.0.0/design.md:160-172`.
- The code conventions: `spec/changes/1.0.0/design.md:143-150`.
- The settings snippet: `spec/changes/1.0.0/workflow.md:127-133`.
- The approved trees of `src/plugins/dotclaude/slices/prompt/`, `plugins/`, `tools/`, and `tests/`: `spec/changes/1.0.0/tree.md:99-107` and `:193-225`.
- The kernel of P01a, which is merged: `src/kernel/slice.ts` (the `Slice` contract and the order of the phases) and `src/kernel/budget.ts`.
- The generator of 0.28.0: `tools/generate.ts` (298 lines).
  It copies the texts of `src/plugins/<plugin>/` to `plugins/<plugin>/`, fills `{{include NAME}}` from `src/shared/`, and makes a module from a folder `NAME.ts/`.
  Its tests: `tests/support/generate.test.ts`.
- The hooks module of 0.28.0, written by hand: `plugins/dotclaude/hooks/register.ts` (233 lines).
  Its header, at lines 22-24, says that `claude plugin validate` follows `$` only into a function of that file, and that each `$.env.get` call needs a literal name.
- The `prompt` feature of 0.28.0: `plugins/dotclaude/features/prompt/` (`select.ts`, `shared.ts`, `texts.ts`, `variants.ts`), its text source `src/plugins/dotclaude/features/prompt/texts.ts/`, its handlers at `plugins/dotclaude/hooks/register.ts:146-176` (`prompt.compose`, `agent.spawn`, and `prompt.section` on `context_management`), its tests `tests/dotclaude/prompt-variants.test.ts`, and its hook lab `plugins/dotclaude/tests/variants.test.ts`.
- The file-size test: `tests/support/file-size.test.ts`, with the bounds in `tools/limits.ts:7-9`.
- The bounds rule and the import rule of `AGENTS.md`: `AGENTS.md:45-53`.
- The scripts: `package.json` (`lint` runs `bunx biome ci plugins tests tools`, with no `src`), `justfile` (`generate`, `check`, `validate`, `lab`), and `tsconfig.json` (its `include` has no `src`).

## Steps

1. Write `tools/generate/` as in `tree.md:211-213`: `index.ts`, `discover.ts`, `order.ts`, `closure.ts`, and `emit/register.ts`, `emit/hooks.ts`, `emit/manifest.ts`, `emit/snippet.ts`, and `emit/texts.ts`.
   - `discover.ts` finds each `src/plugins/<plugin>/slices/*/slice.ts`, with no list of slices.
   - `order.ts` sorts the handlers of one event and filter by phase, then by slice name, and fails when one slice has two handlers with the same event, filter, and phase.
   - `emit/register.ts` writes `plugins/<plugin>/hooks/register.ts` with one literal `on()` call for each handler.
   - `closure.ts` copies the transitive closure of the `src/kernel/` modules that a plugin imports to `plugins/<plugin>/kernel/`, and changes each import path in the copy of a slice.
   - `emit/snippet.ts` writes the settings snippet from the `settings` entries of the slices, in the property order of `schemas/claude-code-settings.json`, with the keys of `env` in alphabetical order, and fails when two slices set one key to different values.
   - `emit/manifest.ts` writes `plugin.json` from `plugin.ts` and the `userConfig` of each slice, `emit/hooks.ts` writes `hooks.json`, and `emit/texts.ts` writes the skills, agents, output styles, and launchers.
   - `just generate --check` exits 1 and names each file of `plugins/` that differs from the output.
   - The generator fails on a file in `plugins/` that it did not write and that `tools/rebuild-pending.txt` does not name.
2. Keep the 0.28.0 hooks and texts working until their packages port them.
   The generated `register.ts` registers the handlers of the slices, and then the handlers of 0.28.0 that are not ported yet, from a hand-written module that `tools/rebuild-pending.txt` names.
   The texts of 0.28.0 in `src/plugins/<plugin>/` outside `slices/` keep their current output.
   Before you build on this approach, run `claude plugin validate --strict` on a generated `register.ts` whose handler is in a slice file and reads `$.env.get` there.
   When `validate` rejects it, stop and report the output, because the design of each slice depends on it.
3. Port `prompt` to `src/plugins/dotclaude/slices/prompt/`: `slice.ts`, `limits.ts`, `domain/apply.ts`, `domain/variants.ts`, and `adapters/mod.ts`, with the same behavior.
   Move its tests to `tests/dotclaude/prompt/` and its hook lab test to `slices/prompt/lab/`.
   Remove the 0.28.0 files of `prompt` from `plugins/` and `tests/`, and its handlers from the 0.28.0 module.
4. Move the texts of `src/shared/` to `src/fragments/`, and move `snippet.json` into the generator as the settings entries of the slices and of the 0.28.0 module.
   Delete `src/shared/`.
5. Write `tools/rebuild-pending.txt`: one line for each 0.28.0 path in `plugins/`, `src/`, and `tests/` that no package has ported, grouped under a comment that names the package that ports it (see `spec/changes/1.0.0/packages.md`).
6. Add the checks:
   - `useArrowFunction` at the level `error` in `biome.json`, and the GritQL plugin `tools/lint/arrow-functions.grit` that reports a `function` declaration.
   - `noRestrictedImports` overrides: a slice imports only `src/kernel/` and its own folder, and `domain/` imports no adapter and no `src/kernel/node/`.
   - The paths of `tools/rebuild-pending.txt` are exempt from the new rules, and from no other rule.
     Keep one list of these paths, so that a later package removes a path in one place.
   - `src` in the `lint` script and in the `include` of `tsconfig.json`, and `just generate --check` in `just check`.
   - The file-size rule moves from `tests/support/file-size.test.ts` to `just validate`.
7. Write the tests in `tests/tools/generate/`, on fixture slices in that folder: the order of the handlers in `register.ts`, the failure on two handlers with the same event, filter, and phase, the kernel closure, the import paths in the copies, the snippet in schema order, and the failure on two values for one key.
8. Change `AGENTS.md` to the new layout and bounds (`src/kernel/budget.ts`, `slices/<s>/limits.ts`, `tools/limits.ts`, and the import rules of `design.md:127-128`), in STE-flavored ASD-STE100, with semantic line breaks and no semicolons.
   Add `GEMINI.md` as a symlink to `AGENTS.md`, next to `CLAUDE.md`.
9. Run `just generate`, then `just check`.

## Acceptance

- `just check` passes.
- `bunx biome lint` fails on a fixture with a `function` declaration and on a fixture with a `function` expression.
  Show both outputs in your report.
- `just generate --check` passes after `just generate`, and fails after a hand edit of a generated file.
- `just lab` passes with the `prompt` slice in the generated `register.ts`.
- Each file has 300 lines or less, and each test file has 500 lines or less.

## Boundaries

- Change only the paths of `owns`, the generated files of `plugins/`, and the 0.28.0 files of `prompt` in `plugins/` and `tests/`.
- Port no slice except `prompt`.
- Do not change the behavior of a 0.28.0 hook that is not ported.
- Add no legacy shim, no alias of an old name, and no fallback for an old file layout.
  The 0.28.0 module of step 2 is the one exception, and `tools/rebuild-pending.txt` names it.
- Commit the work in one commit on the branch of your worktree, with the subject `dotclaude 1.0.0: P01b <summary>`.
  The main session merges it.
