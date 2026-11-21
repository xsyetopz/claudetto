---
status: accepted
date: 2026-11-16
---
# Ask Rules for Destructive Commands

## Context and Problem Statement

The agent terms (SA-2.1) want `ask` rules for tree-changing git (`stash`, `reset`, `clean`, `checkout --`, `restore`, `rebase`, `push`, `tag`) and for edits to Terms, rules, CLAUDE.md and AGENTS.md, and `deny` for `pkill`, `killall` and `.env` reads (SA-2.2). D321 cut `ask` rules because an ask rule overrides auto mode; its "Command rules" group wrote no `permissions.ask` and removed earlier ones.

## Considered Options

- No `permissions.ask` for destructive commands.
- `permissions.ask` for branch moves, `git worktree remove` and branch deletes.

## Decision Outcome

Chosen: D323. Setup writes `permissions.ask` for branch moves, `git worktree remove` and branch deletes, and `permissions.deny` for `pkill` and `killall`. Deny and ask beat allow, and a hook's allow cannot override. Limit: shell indirection passes a pattern rule, and a Bash `cat` of `.env` needs the sandbox.

Conflict: [ADR-0098](0098-block-only-unrecoverable-destructive-commands.md) (proposed, dated 2026-11-14 by its handoff) blocks only unrecoverable destructive commands and passes the rest; no date orders the two.

## Consequences

- Plain forms miss `sh -c`, `git -C` and substitution.

Source: openspec/changes/archive/2026-11-16-2-1-323/design.md:109; external/please-use-me-often/agent-terms/SCHEDULE-A-ENFORCEMENT.md:24.
