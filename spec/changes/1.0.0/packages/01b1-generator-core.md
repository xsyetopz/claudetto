---
id: P01b1
deps: [P01a]
owns: ["tools/generate/", "tools/generate.ts", "tools/rebuild-pending.txt", "tests/tools/", "tests/support/generate.test.ts", "justfile"]
verify: just test tests/tools && just check
agent: implementer
---

# P01b1 Generator core

## Goal

Write the core of the generator `tools/generate/`, which makes `plugins/` from the slices in `src/`.
First, run the gate of step 1, because the design of each slice depends on its result.
This package ports no slice: P01b2 ports `prompt`, P01b3 adds the snippet, and P01b4 adds the lint rules.

## Context

- Your worktree has no git-ignored file.
  Before a check, run `bun install` in the worktree, and copy each git-ignored types folder of the main checkout `/Users/krystian/CodeProjects/xsyetopz/dotclaude` to the same path in the worktree: `.claude-plugin/types/` and `plugins/*/.claude-plugin/types/`.
  The type check reads them.
- The generated tree and its rules: `spec/changes/1.0.0/design.md:74-94`.
- The slice manifest and the order of the handlers: `spec/changes/1.0.0/design.md:96-126`.
- The rebuild list: `spec/changes/1.0.0/design.md:152-158`.
- The contract: `src/kernel/slice.ts` (`Slice`, `ModHandler`, and `PHASES`).
- The generator of 0.28.0: `tools/generate.ts` (300 lines, at the bound).
  It writes the texts of `src/plugins/<plugin>/` to `plugins/<plugin>/`.
  It skips `src/kernel/` and `src/plugins/*/slices/` (`NO_OUTPUT`, line 58).
- The header of the hand-written hooks module: `plugins/dotclaude/hooks/register.ts:22-24`.
  It says that `claude plugin validate` follows `$` only into a function of that file, and that each `$.env.get` call needs a literal name.

## Steps

1. The gate.
   In a temporary folder outside the repository, make a minimal plugin whose `hooks/register.ts` imports one handler from `slices/x/adapters/mod.ts`, and that handler calls `$.env.get("DISABLE_COMPACT")`.
   Run `claude plugin validate --strict` on it.
   When `validate` rejects it, stop, report the full output, and change nothing in the repository.
2. Move `tools/generate.ts` into `tools/generate/`, with no change of behavior: `index.ts` runs the command, and `emit/texts.ts` holds the text output of 0.28.0.
   Change the `generate` recipe of `justfile` to the new path.
3. Write `discover.ts` (each `src/plugins/<plugin>/slices/*/slice.ts`), `order.ts` (sort by phase, then by slice name, and fail on two handlers of one slice with the same event, filter, and phase), `closure.ts` (copy the closure of the `src/kernel/` modules that a plugin imports to `plugins/<plugin>/kernel/`, and change each import path in the copies of the slices), `emit/register.ts` (one literal `on()` call for each handler), `emit/hooks.ts` (`hooks.json` from the classic hooks), and `emit/manifest.ts` (`plugin.json`).
   Until P01b2, no real slice has a `slice.ts`, so the output of the repository does not change.
4. Write `tools/rebuild-pending.txt`: each 0.28.0 path in `plugins/`, `src/`, and `tests/`, grouped under a comment that names the package of `spec/changes/1.0.0/packages.md` that ports it.
   The generator fails on a file in `plugins/` that it did not write and that the list does not name.
5. Write the tests in `tests/tools/generate/`, on fixture slices in that folder: the order of the handlers, the failure on a duplicate, the kernel closure, the import paths in the copies, and the failure on a file that the list does not name.
   Move the cases of `tests/support/generate.test.ts` that still apply to `tests/tools/generate/`, and delete that file.
6. Run `just generate`, then `just check`.

## Acceptance

- The report has the output of the gate of step 1.
- `just test tests/tools` passes, and `just check` passes.
- `just generate --check` passes after `just generate`.
- Each file has 300 lines or less, and each test file has 500 lines or less.

## Boundaries

- Change only the paths of `owns`.
- Write no emitter for the settings snippet, because P01b3 writes it.
- Do not change the behavior of a 0.28.0 hook or text.
- Use arrow functions, and add no legacy shim.
- Commit on the branch of your worktree after each step that passes its tests, with the subject `dotclaude 1.0.0: P01b1 <summary>`, so that no work is lost at your turn bound.
  Before you reach that bound, report the steps that are done and the steps that are open.
