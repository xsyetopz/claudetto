---
id: P27
deps: [P25]
owns: ["src/plugins/dotclaude/slices/setup/domain/worktree.ts", "tests/dotclaude/setup/worktree.test.ts", "src/plugins/dotclaude/slices/agents/", "src/plugins/dotclaude/slices/spec/skills/", "tests/dotclaude/agents/", "tests/dotclaude/spec/"]
verify: just test tests/dotclaude/setup && just lab && just validate
agent: implementer
---

# P27 `worktrees`

## Goal

Each part of dotclaude that works in a separate checkout uses the worktrees of Claude Code.

## Context

- The entry: `spec/changes/1.0.0/packages.md:142-146`.
- The entry says first to list the worktree features of Claude Code 2.1.296.
  It also says to list each place in `src/` and `spec/changes/1.0.0/` that makes or names a worktree of its own, such as `git worktree add` in the `debugger` agent.
- The `worktree` keys of the setup are the new file `domain/worktree.ts`.
  The `.claude/worktrees/agent-*` entry of the `autoMode` lists is P25, and the `**/.claude/worktrees/` exclude line is P32.
- The rules of the wave: `spec/changes/1.0.0/packages.md:7-15`.

## Steps

1. List the worktree features of Claude Code 2.1.296, with a source for each, in the report.
2. List each place in `src/` and `spec/changes/1.0.0/` that makes or names a worktree of its own.
3. Change each agent and each skill in `src/plugins/dotclaude/slices/agents/` and `src/plugins/dotclaude/slices/spec/skills/` to use the worktrees of Claude Code.
4. Write the `worktree` keys of the setup in `domain/worktree.ts`, and their tests in `tests/dotclaude/setup/worktree.test.ts`.
5. Write the tests of the agents and the spec skills in `tests/dotclaude/agents/` and `tests/dotclaude/spec/`.

## Acceptance

- `just test tests/dotclaude/setup` and `just lab` pass, and `just validate` passes.
- A test shows that no text in `src/` tells an agent to run `git worktree add`.

## Boundaries

- Change only the paths of `owns`.
- Write each text that goes to Claude in strict ASD-STE100, with no forceful words.
- Use arrow functions, and add no legacy shim and no fallback for an old layout.
