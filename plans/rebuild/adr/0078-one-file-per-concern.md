---
status: accepted
date: 2026-11-16
---
# One File Per Concern

## Context and Problem Statement

The plan was one 2,418-line file that mixed concerns, among them a 477-line verbatim prompt. The user asked how the structure should look; every offered option failed and the user asked for industry-standard splits.

## Considered Options

- Split by topic into 15 files (the agent's guess).
- One file per concern.
- Industry-standard documents.

## Decision Outcome

Chosen: one file per concern, cut along industry-standard documents (see [ADR-0085](0085-plan-layout-arc42-hybrid.md)).

## Consequences

No file mixes concerns.

Source: user decision, 2026-11-16 21:05 UTC, one file per concern (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:8613); user decision, 2026-11-16 21:07 UTC, one file per concern (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:8777).
