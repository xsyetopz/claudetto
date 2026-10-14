---
schema: dotclaude-spec/2
kind: package
id: P56
title: Exclude at each session start
wave: 3
deps: ["P93","P119"]
owns: ["src/plugins/dotclaude/slices/setup/","tests/dotclaude/setup/"]
satisfies: ["REQ-2"]
verify: just test tests/dotclaude/setup && just lab
agent: implementer
status: planned
---

## Goal

At each `SessionStart` in a git repository, dotclaude adds each missing local-only pattern to `.git/info/exclude`, at 0 model tokens.

## Context

- `setup/domain/exclude.ts`: `EXCLUDE_HEADER` and `excludeLines`, from `GIT_EXCLUDE_PATTERNS` (`src/kernel/paths.ts:86`).
- `setup/adapters/cli.ts:8,39` and `setup/adapters/exclude-step.ts`: the write of `settings --apply` and `addons --apply`.
- The `SessionStart` handler of the slice: `tests/dotclaude/setup/session-start.test.ts`.
- `.claude/rules/hooks-module.md`: no `node:` in the import graph of a hooks module.
- The decision of the user: `change.md`, 2026-10-14.

## Steps

1. Read the `SessionStart` handler of `setup/adapters/mod.ts` and `exclude-step.ts`.
2. Add the exclude step to the handler.
   Use the `$.fs` API, or run the `setup` CLI with `$.process.run` if `$.fs` cannot append.
3. In a linked worktree, write the exclude of the common git folder.
4. Outside a git repository, and on any failure, write nothing and do not stop the session.
5. Keep the write of `settings --apply` and `addons --apply`.
6. Tests: a lab test for a new repository, a second start that adds nothing, a file with some patterns, a linked worktree, no repository, and a failed write.

## Acceptance

- `just test tests/dotclaude/setup` and `just lab` pass.
- A second start leaves `.git/info/exclude` byte for byte the same.

## Boundaries

- Do not write `.gitignore`.
- Do not change `GIT_EXCLUDE_PATTERNS` in `src/kernel/paths.ts`.
