---
schema: dotclaude-spec/2
kind: package
id: P148
title: Subagent git deny and worktree isolation (I07)
wave: 5
deps: ["P79","P80","P135"]
owns: ["src/plugins/dotclaude/slices/agents/hooks/git.ts","the isolation key of the agent files in src/plugins/dotclaude/slices/agents/agents/","tests/dotclaude/agents/git.test.ts"]
satisfies: ["REQ-9"]
verify: just test tests/dotclaude/agents/git.test.ts && just lab
agent: implementer
status: planned
---

## Goal

A subagent cannot run `git stash`, `git checkout --`, `git reset --hard`, or `git clean`, and each agent that writes code runs in a worktree.

## Context

- I07 in `external/agent-failure-dossier/03-safety-and-trust-boundaries.md:17-80`, and I11: isolation with worktrees.
- The shared-tree git rules are only in `debugger.md` today, and P80 moves them into a fragment.
- `implementer.md:7` has `isolation: worktree`.
- The main session asks on `git reset --hard`, `git clean`, and `git checkout --` (`prompt/slice.ts:169-173`), and a subagent sees no user.

## Steps

1. Add a `PreToolUse` hook on `Bash` in `agents/hooks/git.ts` that denies the four commands in a subagent, and names the agent and the reason: the tree is shared.
2. Find out how the hook tells a subagent from the main session, and write the line of the types file in a comment.
3. Set `isolation: worktree` on each agent that writes code, and write the reason for each agent that does not get it, such as `planner`, which writes only `.dotclaude/spec/`.
4. Tests `git.test.ts`: each command in a subagent is denied, each command in the main session is not denied by this hook, `git status` runs, and the `isolation` key of each agent file.

## Acceptance

- The verify command passes.

## Boundaries

- Do not change the asks of the main session.
- Tests check decisions and keys, not reason text (REQ-17).
