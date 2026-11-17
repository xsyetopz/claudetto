---
status: accepted
date: 2026-11-04
---

# Only The -5-5 Model Family

## Context and Problem Statement

Which models may a session use?

## Considered Options

- All models, including Mythos models.
- The -5-5 family only: `availableModels` [opus-5-5, sonnet-5-5, haiku-5-5] with `enforceAvailableModels` true.

## Decision Outcome

Chosen (2026-11-04): the -5-5 family only, because Mythos models cost too much.

## Consequences

Any other model is refused.

Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:774; user decision, 2026-11-04.
