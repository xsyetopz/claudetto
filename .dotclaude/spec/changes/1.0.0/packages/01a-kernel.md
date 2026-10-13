---
schema: dotclaude-spec/2
kind: package
id: P01a
title: Kernel
wave: 1
deps: []
owns: ["src/kernel/","tests/kernel/"]
satisfies: []
verify: just test tests/kernel
agent: implementer
status: done
---

# P01a Kernel

## Goal

Write `src/kernel/`: the shared code that each slice and each CLI of the 1.0.0 rebuild imports.
The kernel holds the slice contract, the ports, the shared bounds, the types and the reader of the spec store, and the shared pure helpers.
Code that uses `node:`, `bun:`, or `Bun` goes only in `src/kernel/node/`, because the mod runtime of Claude Code cannot load it.

## Context

- Your worktree has no git-ignored file.
  Before a check, run `bun install` in the worktree, and copy each `.claude-plugin/types/` folder of the main checkout `/Users/krystian/CodeProjects/xsyetopz/dotclaude` to the same path in the worktree, because the type check reads them.
- The design of the slice manifest: `.dotclaude/spec/changes/1.0.0/design.md:96-133`.
- The bounds and the code conventions: `.dotclaude/spec/changes/1.0.0/design.md:135-150`.
- The kernel files of the approved tree: `.dotclaude/spec/changes/1.0.0/tree.md:55-66`.
- The state of a change (`state.json`): `.dotclaude/spec/changes/1.0.0/workflow.md:45-50`.
- The change segment of the status line reads the store through `spec-store.ts`: `.dotclaude/spec/changes/1.0.0/workflow.md:118-125`.
- The mod API types: `/Users/krystian/CodeProjects/xsyetopz/dotclaude/.claude-plugin/types/claude-code/index.d.ts:4608` (`EventName`), `:4641` (`Events`), `:6468` (`On`), and `:7134` (`Pattern`).
- The 0.28.0 code to port, as the source of behavior only:
  - `plugins/dotclaude/lib/budget.ts` (55 lines) to `src/kernel/budget.ts`.
  - `plugins/dotclaude/lib/shell.ts` (290 lines) and `plugins/dotclaude/lib/shellkinds.ts` (151 lines) to `src/kernel/shell.ts`.
  - `plugins/dotclaude/lib/text.ts`, `model.ts`, and `errors.ts` to the files with the same names.
  - `plugins/dotclaude/lib/paths.ts`, `run-program.ts`, `hook-io.ts`, and `tail.ts` to `src/kernel/node/`.
- The tests of that code, as the source of cases: `tests/dotclaude/lib/`.

## Steps

1. Write `src/kernel/slice.ts` with `Phase`, `ModHandler`, `ClassicHook`, `StatusSegment`, `UserConfigOption`, and `Slice`, as in `design.md:100-121`.
   Use the real types of the mod API for the event, the filter, and the handler.
   Export the order of the phases as one constant, because the generator sorts by it.
2. Write `src/kernel/ports.ts` with the interfaces `FileReader`, `Clock`, `ProcessRunner`, and `Env`.
3. Write `src/kernel/budget.ts` with the shared runtime bounds of `plugins/dotclaude/lib/budget.ts`.
4. Write `src/kernel/spec-store.ts`:
   - The types of `state.json`: `schema`, the lane of each package (`planned`, `doing`, `review`, `done`, `blocked`), the event log, and the path of the newest handoff.
   - A reader that takes a `FileReader` and gives the state of one change, and a function that finds the active change and counts its `done` packages, for a segment such as `◆ 1.0.0 4/13`.
   - The reader stops with an error that names the file when `schema` has a number that it does not know.
   The Markdown formats (requirements, deltas, tasks, and the front matter of a package) are not in this file, because P02 writes them in `src/plugins/dotclaude/slices/spec/domain/`.
5. Port `shell.ts`, `text.ts`, `json.ts`, `model.ts`, and `errors.ts` to `src/kernel/`, with no `node:`, `bun:`, or `Bun`.
   Put a module in `json.ts` only when two ported modules use it.
6. Port the adapters to `src/kernel/node/`: `fs.ts` (a `FileReader` on `node:fs`), `process.ts` (a `ProcessRunner`), `stdin.ts`, and `paths.ts`.
7. Write the tests in `tests/kernel/`, with the cases of `tests/dotclaude/lib/` that apply.
   Test the reader of the store with a fake `FileReader`, with no file on disk.

## Acceptance

- `just test tests/kernel` passes.
- No file in `src/kernel/` outside `src/kernel/node/` has a `node:` import, a `bun:` import, or a use of `Bun`.
- No file in `src/kernel/` imports from `plugins/`, `tools/`, `tests/`, or `src/plugins/`.
- Each function is an arrow function: `export const f = (a: A): B => ...`.
  A class is only for state that lives across calls.
- Each file has 300 lines or less, and each test file has 500 lines or less.
- `bunx biome lint src/kernel tests/kernel` passes.

## Boundaries

- Change only `src/kernel/` and `tests/kernel/`.
- Do not delete or edit the 0.28.0 files in `plugins/` or `tests/dotclaude/lib/`, because the slices that use them move in later packages.
- Do not write the generator, the Biome rules, or a slice.
- Add no legacy shim, no alias of an old name, and no fallback for an old file layout.
- Commit the work in one commit on the branch of your worktree, with the subject `dotclaude 1.0.0: P01a <summary>`.
  The main session merges it.
