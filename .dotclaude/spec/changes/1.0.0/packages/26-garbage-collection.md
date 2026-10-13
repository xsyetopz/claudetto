---
schema: dotclaude-spec/2
kind: package
id: P26
title: Garbage collection
wave: 3
deps: ["P09"]
owns: ["src/plugins/dotclaude/slices/setup/domain/settings.ts","tests/dotclaude/setup/cleanup.test.ts"]
satisfies: []
verify: just test tests/dotclaude/setup && just lab
agent: implementer
status: done
---

## Goal

dotclaude uses the cleanup of Claude Code, such as `cleanupPeriodDays`.
dotclaude adds no cleanup of its own where Claude Code has one.

## Context

- The entry: `.dotclaude/spec/changes/1.0.0/packages.md:138-141`.
- The entry says first to answer the open items of `.dotclaude/spec/changes/1.0.0/evidence/automode.md#open` on cleanup.
- The setup merges the settings keys in `src/plugins/dotclaude/slices/setup/domain/settings.ts`.
- The rules of the wave: `.dotclaude/spec/changes/1.0.0/packages.md:7-15`.

## Steps

1. Answer the open items of `.dotclaude/spec/changes/1.0.0/evidence/automode.md#open` on cleanup, with a source for each answer.
2. Set the cleanup keys, such as `cleanupPeriodDays`, in `domain/settings.ts` where Claude Code has the cleanup.
3. Remove each cleanup of dotclaude that Claude Code already does.
4. Write `tests/dotclaude/setup/cleanup.test.ts` for each key that the setup writes.
5. Run `just test tests/dotclaude/setup` and `just lab`.

## Acceptance

- `just test tests/dotclaude/setup` and `just lab` pass.
- Each answer on cleanup has a source in the evidence file.
- No cleanup of dotclaude runs where Claude Code has one.

## Boundaries

- Change only the paths of `owns`.
- Use arrow functions, and add no legacy shim and no fallback for an old layout.
