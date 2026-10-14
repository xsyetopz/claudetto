---
schema: dotclaude-spec/2
kind: package
id: P143
title: Recursive rm ask by flag parse, and a wildcard audit
wave: 4
deps: ["P90","P116","P139"]
owns: ["the ask list of src/plugins/dotclaude/slices/prompt/slice.ts","src/plugins/dotclaude/slices/asks/domain/rm.ts","src/plugins/dotclaude/slices/asks/adapters/","tests/dotclaude/asks/rm.test.ts","tests/dotclaude/prompt/wildcards.test.ts"]
satisfies: ["REQ-21"]
verify: just test tests/dotclaude/asks/rm.test.ts tests/dotclaude/prompt/wildcards.test.ts && just lab
agent: implementer
status: planned
---

## Goal

An `rm` asks only when it removes recursively, and no wildcard rule of `slice.ts` matches a command that it does not target.

## Context

- `prompt/slice.ts:175-178`: `Bash(rm -*r*)`, `Bash(rm -*R*)`, `Bash(rm * -*r*)`, and `Bash(rm * -*R*)`.
  A `*` spans spaces, so `rm -f "$TMPDIR/x"` asks, because an `r` comes after the flag.
- `prompt/slice.ts:179-180`: `Bash(rm --recursive*)` and `Bash(rm * --recursive*)`.
- The `asks` slice asks before a call that discards work (`asks/slice.ts:1-3`).
- The audit of 2026-10-14: the globs at `prompt/slice.ts:201-206`, such as `* DROP TABLE *`, match any command with those words, such as `rg "DROP TABLE" src`, and no test covers them.
  The whole-tool denies at `prompt/slice.ts:150-162` have no test, and no brief gives their intent.
  The wildcard audit covers both.

## Steps

1. Parse the flags of each `rm` in a command in `rm.ts`: short flag groups such as `-rf` and `-Rf`, `--recursive`, and `--` as the end of flags.
   Ask only for a recursive flag.
2. Remove the four globs of `:175-178`, and keep or replace `:179-180` by the hook.
3. List each rule of `slice.ts` with a `*` inside a word or after a flag, and test each one with a command it targets and a command it does not target.
   Fix each rule that over-matches.
4. Tests `rm.test.ts`: `rm -f "$TMPDIR/x"`, `rm -rf dir`, `rm -fr dir`, `rm -R dir`, `rm --recursive dir`, `rm -- -r`, `rm a b -r`, and `rm file-r.txt`.
5. Tests `wildcards.test.ts`: the match and non-match of each audited rule, with the matcher of Claude Code rules as the docs give it.

## Acceptance

- The verify command passes.
- `rm -f "$TMPDIR/x"` and `rm file-r.txt` do not ask, and each recursive form asks.

## Boundaries

- Do not remove a deny rule.
- Tests check decisions, not reason text (REQ-17).
