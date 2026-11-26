---
status: accepted
date: 2026-11-17
---
# Block Only Unrecoverable Destructive Commands

## Context and Problem Statement

The user said the guards cause friction, and that only unrecoverable destructive commands on macOS and Linux need a block, and everything else should pass.

## Considered Options

- Block many risky commands.
- Block only unrecoverable destructive commands.

## Decision Outcome

Chosen: only unrecoverable destructive commands are blocked; branch moves, worktree removal and branch deletes get the setup-written `permissions.ask` rules of [ADR-0054](0054-ask-rules-for-destructive-commands.md) (D323), by user decision on 2026-11-17 (asked through AskUserQuestion in session `0342617c`). The two records hold together: the block covers the unrecoverable commands, the ask rules cover the listed git commands, and every other command passes.

## Consequences

Fewer hook errors and less friction; a recoverable command passes.

Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:37070 (handoff, constraints).
