---
schema: dotclaude-spec/2
kind: package
id: P34
title: Spec store events
wave: 3
deps: ["P32"]
owns: ["src/kernel/spec-store.ts","src/plugins/dotclaude/slices/spec/adapters/",".gitattributes","tests/kernel/","tests/dotclaude/spec/cli/"]
satisfies: []
verify: just check
agent: implementer
status: done
---

## Goal

An append-only `events.jsonl` with one line for each lane change replaces `state.json`.
The lanes come from the last line of each package, so no lane map can drift from the log.

## Context

- The entry: `.dotclaude/spec/changes/1.0.0/packages.md`, P34.
- The decision of the user: `.dotclaude/spec/changes/1.0.0/change.md`, decisions, 2026-10-12.
- On 2026-10-12, `state.json` had 4604 bytes in 238 lines: `lanes` 551 bytes, and `events` 2451 bytes with 38 entries that repeat the facts of `lanes`.
- Only the `dotclaude-spec` CLI and the status line read the store, and Claude does not.
- P32 moves the store to `.dotclaude/spec/changes/`, and puts the paths in `src/kernel/paths.ts`.

## Steps

1. Write the format: a first header line with `schema`, then one line for each lane change, such as `{"at":"…","package":"P30","lane":"done"}`.
   The handoff path goes where P32 puts the handoff files, not in the store.
2. Change the reader and the writer in `src/kernel/spec-store.ts`: the lanes are the last lane of each package in the log, merged with the package files as now (a package with a file and no line is `planned`).
3. Change `lane`, `status`, `next`, `validate`, `new`, and the status line to the new reader and writer.
4. Set `merge=union` for `events.jsonl` in `.gitattributes`.
5. Convert this repository's store once, from `state.json` to `events.jsonl`, and delete `state.json`.
   Add no reader for the old format.
6. Write the tests of Acceptance.

## Acceptance

- `just check` passes.
- A test shows that the lanes of a log equal the last line of each package.
- A test shows that two appends on two branches merge with no conflict.
- `dotclaude-spec status 1.0.0` prints the same counter before and after the conversion.

## Boundaries

- Change only the paths of `owns`, and the converted store.
- Use arrow functions, and add no legacy shim and no fallback for an old layout.
