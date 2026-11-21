---
status: accepted
date: 2026-11-09
---
# Grader Faults the Person Removed

## Context and Problem Statement

The Stop grader of the first change graded the faults `asks`, `jargon`, `confesses`, `narrates`, `unfiled`, `unchecked`, `unseen`, `credited`, and `fallback`. The second change asked the user which to keep.

## Considered Options

- Keep every fault of the first change (see [ADR-0015](0015-grader-faults-kept-in-change-1.md)).
- Remove `asks`, `jargon`, `confesses`, `narrates`, and `unfiled`; keep `unchecked`, `unseen`, `credited`, `fallback`.

## Decision Outcome

Chosen: Remove `asks`, `jargon`, `confesses`, `narrates`, and `unfiled`; drop the ledger rule "an ask waits for the newest issues file". `unchecked`, `unseen`, `credited`, and `fallback` stay. The user chose this in a popup on 2026-11-09.

## Consequences

Four grader faults and their tests and CHANGELOG lines go. No grader exists in `plugins/` at 088a227c, so the faults stay to be built from the kept list.

Source: openspec/changes/archive/2026-11-10-release-2-1-319-1/design.md:114; openspec/changes/archive/2026-11-10-release-2-1-319-1/tasks.md:18; user decision, 2026-11-09.
