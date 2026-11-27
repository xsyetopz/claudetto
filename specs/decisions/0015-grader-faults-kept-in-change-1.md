---
status: superseded by ADR-0016
date: 2026-11-09
---
# Grader Faults Kept in the First Change

## Context and Problem Statement

The first change defined the graded faults of the Stop claim check.

## Considered Options

- Keep `asks`, `jargon`, `narrates`, `confesses`, and `unfiled` with the other faults.
- Remove some of them.

## Decision Outcome

Chosen: The first change kept all of them, with the ledger rule "an ask waits for the newest issues file". The second change superseded this.

## Consequences

Superseded: see [ADR-0016](0016-grader-faults-removed.md).

Source: openspec/changes/archive/2026-11-10-release-2-1-319-1/design.md:114; openspec/changes/archive/2026-11-09-release-2-1-319/specs/claim-check/spec.md:9.
