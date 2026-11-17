---
status: accepted
date: 2026-11-14
---
# Write The Handover With A Low-Effort Fork

## Context and Problem Statement

The handover needs a writer. Core compaction gives no control over prompt or size. A full main-agent turn costs more than a tool-less fork over the same cached prefix.

## Considered Options

- The core compaction summary.
- The main agent writing it in a full turn.
- $.model.fork with effort low over the cached prefix.
- A zero-cost extract from $.session.messages().

## Decision Outcome

Chosen: $.model.fork with effort low as the writer; the extract is the fallback.

## Consequences

Live probe E on Haiku 5.5: the fork took 2401 ms over a 67k-token cached prefix and cost $0.0018.

Source: observed in transcript, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:6738); (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:7297).
