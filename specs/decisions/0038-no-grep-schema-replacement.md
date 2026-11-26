---
status: accepted
date: 2026-11-13
---

# No Grep Replacement with a Short Schema

## Context and Problem Statement

Can claudetto cut request size further, after the prompt and tool trims of 2.1.321?

## Considered Options

- Replace Grep through $.tool.register with a short schema, cutting up to 2,747 schema characters.
- Measure the 46 tools that have no row yet in a terminal run.
- Do neither.

## Decision Outcome

Chosen option: do neither. A Grep replacement changes what the tool takes, so the user must approve it, and Grep is absent from the default set, so it gains nothing now. The terminal measurement is dropped because a probe or item found no unloaded tool adds characters.

## Consequences

- Grep keeps its stock schema.
- Settled decision "no component swaps" holds.

Source: openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:870-880 (candidates 2 and 3 of P231-P235; P242).
