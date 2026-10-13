---
schema: dotclaude-spec/2
kind: package
id: P51
title: Phase Skills and Hooks
wave: 8
deps: ["P49","P50"]
owns: ["src/plugins/dotclaude/slices/spec/skills/","src/plugins/dotclaude/slices/spec/slice.ts","src/plugins/dotclaude/slices/spec/adapters/mod.ts","src/plugins/dotclaude/slices/spec/domain/ship-lane.ts","src/plugins/dotclaude/slices/spec/lab/"]
satisfies: []
verify: just check && just lab
agent: main session
status: done
---

## Goal

Each phase has one slash command with the verb of its CLI subcommand, and the hooks follow the states of schema 2.

## Context

- The design: `design-spec.md`, sections Commands and Hooks.
- The current skills `spec`, `ship`, and `hotfix` hold the steps that the new skills split.

## Steps

1. Write the skills `specify`, `plan`, `implement`, `review`, `merge`, `accept`, and `archive`.
   Each skill runs its CLI subcommand and stops when the gate refuses.
2. `/dotclaude:specify` asks the user each `[NEEDS CLARIFICATION]` question before it runs `dotclaude-spec specify <id>`.
3. `/dotclaude:implement` starts the `implementer` agents of the ready packages, and runs `verify` after each one ends.
4. `/dotclaude:review` starts one `reviewer` for each `verified` package, and records `approve`, or `reject` with the findings and a decision.
5. Remove the skills `spec`, `ship`, and `hotfix`.
6. Remove the `turn.complete` move to `review`, and keep the `agent.spawn` move to `doing`.

## Acceptance

- The hook labs pass, and the sandbox session runs both changes to `archived`.

## Boundaries

- Do not change the CLI, because P49 owns it.
