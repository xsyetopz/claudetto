---
status: accepted
date: recorded in openspec/changes/archive/2026-11-10-release-2-1-319-1/tasks.md:18 (day of decision not recorded)
---
# Change-2 Removals Chosen by the Person

## Context and Problem Statement

Change 2 of the 2.1.319 rebuild removes requirements the user chose to drop.

## Considered Options

- Keep each requirement.
- Remove it.

## Decision Outcome

Chosen: remove the parts below, on 2026-11-09.
- permission-policy "A Secret Stays off the Command Line" (`GATE_ENV_VALUES`, `GATE_ENV_DUMP`);
- the building-blocks spec (`attachBlocks`);
- [ADR-0133](0133-constraint-ledger.md) "An Ask Waits for the Newest Issues File", with `unfiled`;
- grader faults `asks`, `jargon`, `confesses`, `narrates`;
- notifications off by default and the env-file hook (5.13);
- the `shared/secrets/` layout.

## Consequences

- Each removed text and test goes with it.

Source: openspec/changes/archive/2026-11-10-release-2-1-319-1/tasks.md:18; openspec/changes/archive/2026-11-10-release-2-1-319-1/specs/permission-policy/spec.md:326; openspec/changes/archive/2026-11-10-release-2-1-319-1/specs/building-blocks/spec.md:5; openspec/changes/archive/2026-11-10-release-2-1-319-1/design.md:72.
