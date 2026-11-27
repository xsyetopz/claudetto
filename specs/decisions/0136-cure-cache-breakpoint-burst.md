---
status: accepted
date: recorded in openspec/changes/archive/2026-11-16-2-1-323/research/defects.md:712 (day of decision not recorded)
---

# Cure for the Cache Breakpoint Burst

## Context and Problem Statement

Cache rebuilds follow runs of 22 or more lookback positions: the API checks at most 20 positions back from the single moving message breakpoint, and each system-reminder text block counts one position. Over 25 positions, 43 of 44 steps rebuilt (97.7%). One first read that loaded 22 path-scoped rules wrote 41,147 tokens. Which cure does claudetto use?

## Considered Options

- A `turn.step` hook that caps tool chunks at 8 per step.
- A mod that merges reminders or writes `cache_control`.
- Rules without `paths:` (they load at session start), and dropping `paths: "**/*"` from a repo's 17 path rules.

## Decision Outcome

Chosen: rules without `paths:`, and drop `paths: "**/*"` from the repo's 17 path rules. The second part is the user's decision.

The `turn.step` cap works mechanically (the engine records only 8 and the model must ask again) but is void, because a parallel batch counts two positions. A mod cannot merge reminders (`prompt.attachment` sees one attachment) or write `cache_control`.

## Consequences

- Rules load once at session start, so a first read adds no reminder run.
- Path-scoped loading is lost for those rules.

Source: openspec/changes/archive/2026-11-16-2-1-323/research/defects.md:712; openspec/changes/archive/2026-11-16-2-1-323/research/defects.md:716; openspec/changes/archive/2026-11-16-2-1-323/research/defects.md:718 (measured, cited).
