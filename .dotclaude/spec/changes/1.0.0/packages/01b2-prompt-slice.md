---
schema: dotclaude-spec/2
kind: package
id: P01b2
title: The `prompt` slice
wave: 1
deps: ["P01b1"]
owns: ["src/plugins/dotclaude/plugin.ts","src/plugins/dotclaude/slices/prompt/","tests/dotclaude/prompt/"]
satisfies: []
verify: just test tests/dotclaude/prompt && just lab && just check
agent: implementer
status: done
---

## Goal

Port the `prompt` feature of 0.28.0 to the first real slice, so that the generator of P01b1 writes `plugins/dotclaude/hooks/register.ts`.
The 0.28.0 handlers that are not ported yet stay in one hand-written module, which the generated `register.ts` calls.

## Context

- Your worktree has no git-ignored file.
  Before a check, run `bun install` in the worktree, and copy each git-ignored types folder of the main checkout `/Users/krystian/CodeProjects/xsyetopz/dotclaude` to the same path in the worktree: `.claude-plugin/types/` and `plugins/*/.claude-plugin/types/`.
  The type check reads them.
- The source tree of a slice: `.dotclaude/spec/changes/1.0.0/design.md:58-72`, and the files of `prompt`: `.dotclaude/spec/changes/1.0.0/tree.md:99-107`.
- The contract: `src/kernel/slice.ts`.
- The generator: `tools/generate/discover.ts` and `tools/generate/emit/register.ts`.
- The `prompt` feature of 0.28.0: `plugins/dotclaude/features/prompt/` (`select.ts`, `shared.ts`, `texts.ts`, and `variants.ts`, 270 lines), with its text source `src/plugins/dotclaude/features/prompt/texts.ts/`.
- Its handlers: `plugins/dotclaude/hooks/register.ts:146-176` (`prompt.compose`, `agent.spawn`, and `prompt.section` on `context_management`).
- Its tests: `tests/dotclaude/prompt-variants.test.ts`, and its hook lab test `plugins/dotclaude/tests/variants.test.ts`.
- The rebuild list: `tools/rebuild-pending.txt`.

## Steps

1. Write `src/plugins/dotclaude/plugin.ts` with the name, the description, and the keywords of the plugin, from `plugins/dotclaude/.claude-plugin/plugin.json`.
2. Write the slice: `slice.ts`, `limits.ts`, `domain/apply.ts`, `domain/variants.ts`, and `adapters/mod.ts`, with the same behavior as 0.28.0.
   Put its texts in the slice folder.
3. Move the 0.28.0 handlers that are not `prompt` from `plugins/dotclaude/hooks/register.ts` to `plugins/dotclaude/hooks/legacy.ts`, with no change of behavior.
   The generated `register.ts` registers the `prompt` handlers, then calls the register function of `legacy.ts`.
   When the generator needs a change for this call, make the smallest change in `tools/generate/emit/register.ts`, and name it in your report.
   Close the two gaps of the generator that the port showed (Jev, confidence 0.72), each with a test on a fixture in `tests/tools/generate/`:
   - A slice folder `NAME.ts/` of `.md` texts gives the module `NAME.ts` in the copy of the slice, as `tools/generate/emit/texts.ts` does for 0.28.0, and `tools/generate/emit/slices.ts` does not copy the folder itself.
   - `tools/generate/emit/hooks.ts` keeps the `description` and the classic hooks of `src/plugins/dotclaude/hooks/hooks.json` in the generated `hooks.json`, so that no hook of 0.28.0 is lost, and the source no longer collides with the output.
4. Move the tests to `tests/dotclaude/prompt/`, and the hook lab test to `slices/prompt/lab/`.
5. Remove the 0.28.0 files of `prompt` and their lines in `tools/rebuild-pending.txt`, and add `plugins/dotclaude/hooks/legacy.ts` to the list.
6. Run `just generate`, `just lab`, and `just check`.

## Acceptance

- `just test tests/dotclaude/prompt`, `just lab`, and `just check` pass.
- `claude plugin validate --strict plugins/dotclaude` passes on the generated `register.ts`.
- No file of the slice imports from `plugins/`, `tools/`, or `tests/`.
- Each file has 300 lines or less, and each test file has 500 lines or less.

## Boundaries

- Change only the paths of `owns`, the 0.28.0 files of `prompt`, `plugins/dotclaude/hooks/`, `tools/rebuild-pending.txt`, the generator changes of step 3 in `tools/generate/emit/register.ts`, `texts.ts`, `slices.ts`, and `hooks.ts`, and their tests in `tests/tools/generate/`.
- The generated `register.ts` has a `// eval: <event> <slice>` comment above each `on()` call, because `tests/support/hook-evals.test.ts` asks for one, and the generator writes the `lab/` tests of a slice to `plugins/<plugin>/tests/` and not into the copy of the slice.
  Change the paths of the moved lab tests in `plugins/dotclaude/evals/hooks.json`.
- Port no other slice, and do not change the behavior of a 0.28.0 hook.
- Use arrow functions, and add no legacy shim except `legacy.ts`, which the rebuild list names.
- Commit on the branch of your worktree after each step that passes its tests, with the subject `dotclaude 1.0.0: P01b2 <summary>`.
  Before you reach your turn bound, report the steps that are done and the steps that are open.
