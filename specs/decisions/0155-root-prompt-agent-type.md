---
status: superseded by ADR-0156
date: no source line located (day of decision not recorded)
---

# Root Prompt as an Agent Type

## Context and Problem Statement

The 2-1-319 plan ran the root prompt as an agent type.

## Considered Options

* Agent type body.
* `prompt.compose`.

## Decision Outcome

Chosen: Superseded by the 2-1-323 design.

### Consequences

The type was removed.

### Confirmation

The agent listing has no `claudetto:main`.

## More Information

Basis: read. Status: superseded.

Source: openspec/changes/archive/2026-11-09-release-2-1-319/parity.md:355@088a227c9^ (Setup removes the retired `claudetto:main` agent key); openspec/changes/archive/2026-11-16-2-1-323/design.md:24@088a227c9^ (`prompt.compose` replaces the body per model).
