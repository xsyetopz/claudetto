---
status: accepted
date: 2026-11-13
---
# Compaction Path Has No userConfig

## Context and Problem Statement

C kept `handoverThresholdTokens` (default min(400000, window/2)), `HANDOFF_TRIGGER_TOKENS` 140,000 (Haiku 90,000) and `heavyContextTokens` 400,000. B and D321 delete them.

## Considered Options

- Keep the options (C).
- No `compaction` option, no `pathOf`, no `handoverThresholdTokens`, no `cheapSummary`, no `cheapSummaryEnabled`; `tools/manifest.test.ts` checks plugin.json (a lab file cannot read it).

## Decision Outcome

Chosen: no userConfig on the compaction path. External cost claims change a default only on rows of this login (four sources read 2026-10-28, none changed a value); the code path returns only when a docs verdict stops saying "No winner".

## Consequences

- Good: fewer options to keep in step.
- Unchecked: plugin.json at 088a227c was not grepped for the absence of these keys.

Source: openspec/specs/compaction-path/spec.md:58; openspec/changes/archive/2026-11-13-feat-2-1-321/specs/compaction-path/spec.md:5.
