---
status: superseded by ADR-0117
date: no source line located (day of decision not recorded)
---

# First-Draft Agent Roster

## Context and Problem Statement

The first roster named `search`, `plan`, `work`, `sweep` with search and plan on Sonnet.

## Considered Options

* Keep the first draft.
* Replace it with Artemis, Metis, Athena, Heracles.

## Decision Outcome

Chosen: Superseded: the 2-1-323 design renamed the agents and moved search to Haiku.

### Consequences

None remain in the plugin; the old names appear only in the deleted OpenSpec.

### Confirmation

`git grep -l "search/plan/work"` finds no live prompt.

## More Information

Basis: read. Status: superseded.

Source: openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:648@088a227c9^ (first roster `search`, `plan`, `work`, `sweep`); openspec/changes/archive/2026-11-16-2-1-323/design.md:87-94@088a227c9^ (Artemis, Metis, Athena, Heracles; Artemis on Haiku).
