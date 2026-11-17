---
status: superseded by ADR-0087
date: 2026-11-16
---
# A Script Picks The Holdout Tasks Blind

## Context and Problem Statement

Who picks and holds the unseen holdout tasks (`bench-holdout`)?

## Considered Options

- A script picks blind: it draws N random tasks from the mined candidates into `~/.claudetto-holdout` without printing them, and the user runs the final round.
- Other options were not recorded in the handoff.

## Decision Outcome

Chosen: The user chose "Script picks blind" with an `AskUserQuestion` answer. The set is unseen but not independent, since the agent wrote the selector. The user later said they cannot score anything and that no benchmark was asked for.

## Consequences

Good: unseen set. Bad: the user cannot run the scoring round; the set is now moot.

Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:1092 (handoff Decisions); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:4057; user answer through AskUserQuestion, 2026-11-16 15:44 UTC, a script picks the holdout tasks blind (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:775).
