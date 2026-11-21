---
status: superseded by ADR-0082
date: 2026-11-09
---
# Root Prompt Size Cap

## Context and Problem Statement

The root prompt needs a size cap. Two values stand: 5,218 bytes (the C archive baseline) and 5,832 chars (the B tasks). The cap was also stated as "the stock lean prompt body" (clawdipedia `prompts/defaults/default-lean`).

## Considered Options

- At most 5,218 bytes (baseline).
- At most 5,832 chars (B tasks).
- The shared core under about 3,500 chars, with a body per model.

## Decision Outcome

Chosen: Superseded. D323 drops `ROOT_PROMPT` and its `scope: "shared"` text; the shared core stays under about 3,500 chars. See [ADR-0082](0082-per-model-system-prompt.md).

## Consequences

- The footprint check tests the per-model bounds, not either old cap.

Source: openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:7; openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:98; openspec/changes/archive/2026-11-16-2-1-323/design.md:81.
