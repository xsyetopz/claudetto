---
schema: dotclaude-spec/2
kind: package
id: P144
title: File-print deny on whole commands only
wave: 3
deps: ["P88","P114"]
owns: ["src/plugins/dotclaude/slices/guard/domain/deny.ts","src/plugins/dotclaude/slices/guard/domain/reads.ts","tests/dotclaude/guard/print-compound.test.ts","tests/dotclaude/guard/print.test.ts"]
satisfies: ["REQ-22"]
verify: just test tests/dotclaude/guard/print-compound.test.ts && just test tests/dotclaude/guard && just lab
agent: implementer
status: planned
---

## Goal

The "This command only prints a file" deny fires only when each part of the command prints a file.

## Context

- `guard/domain/deny.ts:44-60`: `printReason` denies the first print in a command (`printsOf` of `reads.ts`).
- It fired 11 or more times in session `d87f7ed2`, 4 times in the main session, and 3 times in the planner run of this plan, on commands that also ran `ls`, `git status`, `grep -rln`, `wc`, or a CLI.
- `tests/dotclaude/guard/print.test.ts:71-86` pins the deny of compound commands, which this package changes.
  The audit of 2026-10-14 counted 27 distinct denied tool calls in `~/.claude/projects/`, and 26 of them were compound.
- `design.md`, "Command rules".

## Steps

1. Change `printReason` to deny only when each part of the command, split at `;`, `&&`, `||`, and `|`, is a file print or a `cd`.
2. Keep the deny of a single print, such as `cat F`, `sed -n 1,80p F`, and `head -n 20 F`.
3. Change the compound cases of `print.test.ts:71-86` to the decisions of step 1, because they pin the old design.
4. Tests `print-compound.test.ts`: `cat F` denies, `cd D && cat F` denies, `ls D; cat F` runs, `git status && cat F` runs, `grep -rln X D; sed -n 28p F` runs, `wc -l F && cat F` runs, and `cmd; echo "exit $?"; cat F` runs.

## Acceptance

- The verify command passes.

## Boundaries

- Do not change the GitHub owner ask of the slice.
- Tests check decisions, not reason text (REQ-17).
