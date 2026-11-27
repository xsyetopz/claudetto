---
status: accepted
date: recorded in openspec/specs/surface-trim/spec.md:222 (day of decision not recorded)
---
# Tool Results Stay Folded

## Context and Problem Statement

The expanded shell-group fold ([ADR-0141](0141-expanded-shell-group-fold-superseded.md)) needed a `ui.render` hook.

## Considered Options

- Expand through `isExpanded`.
- Leave the engine fold.

## Decision Outcome

Chosen: leave the engine fold; claudetto does not make the transcript draw a tool result in full.

## Consequences

- No fold code is needed at 088a227c.

Source: openspec/specs/surface-trim/spec.md:222; openspec/specs/surface-trim/spec.md:232.
