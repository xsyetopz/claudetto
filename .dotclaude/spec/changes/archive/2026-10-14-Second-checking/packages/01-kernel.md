---
schema: dotclaude-spec/2
kind: package
id: P01
title: Kernel
wave: 1
deps: []
owns: ["src/kernel/","src/fragments/","tests/kernel/",".dotclaude/spec/changes/1.0.0/evidence/second-check-kernel.md"]
satisfies: []
verify: just test tests/kernel
agent: implementer
status: done
---

## Goal

Make the kernel tolerate the input that 0.28.0 assumed clean, and keep every behavior that 1.0.0 documents.

## Context

- `src/kernel/spec-store.ts:55,82` `parseLine` throws on a non-JSON line, and `CHANGELOG.md:151` documents that the reader names the file and the line. A torn last line makes a change unreadable. Delta: `specs/spec-store.md`. Any change here is a change of documented behavior, so write it in the evidence file.
- `src/kernel/node/fs.ts:12-19` `writeAtomic` already removes the temporary file and rethrows when the write or rename fails (read in the second look). Only a retry on a Windows rename over an open file is open (guessed); test it or reject it.
- `src/kernel/shell.ts:114-115` returns `truncated` past 200,000 characters; read `slices/asks/.../writes.ts:16,154` to see what the caller does. This is policy, so report it, do not change it.
- `src/fragments/`: search for a bare `JSON.parse` and for a write that is not `writeAtomic`.

## Steps

1. Read the dossiers of `external/` that bear on the area (search with `grep`, never read an `export-*.jsonl` whole), and note each Claude Code claim with its file and line.
2. For each candidate of Context, write a test that fails on `ad61fb01` when the defect is real.
   If no such test is possible, mark the candidate `rejected` or `open` with the reason.
3. Fix each confirmed candidate at its cause, in the style of the code around it.
4. Search the owned paths for the same pattern (a bare `JSON.parse`, a non-atomic write, a path split on `\`), and give each hit the same test or the same verdict.
5. Write the evidence table to `.dotclaude/spec/changes/1.0.0/evidence/second-check-kernel.md`.
6. Remove from `specs/` of this change each requirement that the evidence rejects.

## Acceptance

- `just test tests/kernel` passes, or the report says that it did not run and names the cause.
- Each candidate of Context has a verdict in the evidence file.
- Each fix has a test that failed before it.

## Boundaries

- Change only the paths of `owns`.
- Do not raise a bound, skip or loosen a test, or edit a lint rule or a rule of `validate`.
- Do not run `just generate`; use `just generate --check`.
- Keep a public signature of the kernel.
