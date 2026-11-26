---
status: accepted
date: 2026-11-16
---
# Use Each Hook Kind for Its Purpose, Found by Probe

## Context and Problem Statement

The overnight goal asked that each hook kind serve its purpose, found by probe, and that a guard stay only for a failure caught in real transcripts.

## Considered Options

- Guard by hunch.
- Probe the kind; keep a guard for a caught failure.

## Decision Outcome

Chosen: the second.

## Consequences

Engine rule: one unmatched hook per event per module, so runs.ts uses matchers that take every value.

Source: user goal set through `/goal`, 2026-11-16 06:24 UTC, each hook kind serves its purpose, found by probe (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:11); observed in transcript, 2026-11-09 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/638670c4-640d-44ab-83a2-436d1d918089.jsonl:11).
