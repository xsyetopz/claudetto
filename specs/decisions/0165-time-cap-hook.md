---
status: superseded by ADR-0041
date: recorded in openspec/changes/archive/2026-11-13-feat-2-1-321/specs/run-limits/spec.md:166 (day of decision not recorded)
---

# Cap Agent Run Time with a Hook

## Context and Problem Statement

How does claudetto end a background agent that runs too long?

## Considered Options

- A hook counts run time and refuses calls of an agent past a limit (15 minutes).
- The engine's stall timeout counts silence.

## Decision Outcome

Chosen option at the time: the time-cap hook. Superseded by [ADR-0041](0041-stall-timeout-replaces-time-cap.md).

## Consequences

- The hook refused calls of agents that still made progress.

Source: openspec/changes/archive/2026-11-13-feat-2-1-321/specs/run-limits/spec.md:166.
