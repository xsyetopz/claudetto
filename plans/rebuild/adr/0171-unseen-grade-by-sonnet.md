---
status: accepted
date: recorded in openspec/changes/archive/2026-11-09-release-2-1-319/design.md:445 (day of decision not recorded)
---

# The Unseen Grade Goes to Sonnet

## Context and Problem Statement

Which model grades `unseen` (a reply that names a block, value, or event shown only in tool output, with no text or file:line)?

## Considered Options

- Haiku with the turn's tool results in its prompt.
- Sonnet, asked for `unseen` alone.
- Sonnet offered beside `credited`, `fallback`, and `unfiled`, with only `unseen` kept.

## Decision Outcome

Chosen: the third option, a second call to Sonnet that runs in parallel when the turn has tool output; it sees the latest 8 tool results, 400 characters each, labelled as not shown to the user. Haiku failed the bar (`probe-144`, held-out 8 positives and 39 negatives: 0 to 4 of 31 clean flagged per run, precision about 0.79), and a backtick-span pre-filter capped recall at 4/8. Sonnet for `unseen` alone flagged 8/39 in both runs (`probe-147`, the shipped `VERIFY_GRADE`). The third option gave recall 8/8, 7/8, 8/8 and flagged 0/39, 1/39, 1/39 in three runs.

## Consequences

Basis: measured.

Source: openspec/changes/archive/2026-11-09-release-2-1-319/design.md:445.
