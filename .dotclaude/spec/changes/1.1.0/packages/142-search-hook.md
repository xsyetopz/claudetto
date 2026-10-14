---
schema: dotclaude-spec/2
kind: package
id: P142
title: Raw search hook with a bounded fallback (I18)
wave: 4
deps: ["P88","P114","P74","P144"]
owns: ["src/plugins/dotclaude/slices/guard/domain/search.ts","src/plugins/dotclaude/slices/guard/adapters/mod.ts","src/plugins/dotclaude/slices/guard/limits.ts","tests/dotclaude/guard/search.test.ts",".dotclaude/spec/changes/1.1.0/evidence/search-tools.md"]
satisfies: ["REQ-19"]
verify: just test tests/dotclaude/guard/search.test.ts && just lab
agent: implementer
status: planned
---

## Goal

A `PreToolUse` hook on `Bash` steers `grep`, `rg`, `ugrep`, `find`, and `bfs` to `Grep` and `Glob`, with at most one deny for each agent in a session.

## Context

- `design.md`, "Search tools": the docs, the bundle gate `mk()`, and the decision of the user of 2026-10-14.
- The fixture: the shell `grep -r` skips git-ignored files, and `command grep -r` finds them.
- The guard deny of file prints: `guard/domain/deny.ts`, and its command parser `guard/domain/reads.ts`.
- `.claude/rules/hooks-module.md`: no `node:` in a hooks module.

## Steps

1. Find out how a hook can tell whether `Grep` is in the tools of the session or the agent.
   Write the answer, with the line of the types file or the docs, in the evidence file.
2. The domain `search.ts` gives a decision for a command, the agent, and the tool state:
   (a) the session has `Grep`: deny, and the reason names `Grep` or `Glob`.
   (b) the hook cannot tell: deny the first raw search of each agent once, with a reason to use `Grep` or `Glob` if the agent has them, else to run the same command again.
   The same command from the same agent then runs, and after that the hook denies no raw search of that agent.
   (c) the session has no `Grep`: no deny, and on the first search of each agent one note that the shell `grep` skips git-ignored files and `command grep` finds them.
3. Put `SEARCH_DENY_MAX` (1 for each agent in a session) in `guard/limits.ts`.
4. Register the hook in `adapters/mod.ts`.
5. Tests `search.test.ts`: each of the three branches, the same command that runs on the retry, a second different raw search in branch (b) that runs with no deny, and a test that pins `SEARCH_DENY_MAX`.
6. Add the live check to the evidence file as an unchecked item: `just sandbox-alone` with and without `--allowedTools Grep Glob`, which the user runs.

## Acceptance

- The verify command passes.
- The evidence file has the answer of step 1 and the unchecked live check.

## Boundaries

- Tests check decisions, not reason text (REQ-17).
- Do not add a `DOTCLAUDE_` env var.
- Do not change the file-print deny, which P144 owns.
