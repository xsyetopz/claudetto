---
status: accepted
date: 2026-11-14
---
# A Script Bumps the Version by SemVer

## Context and Problem Statement

The agent shipped a build without a bump. The user said it should be bumped on the first try and be automatic. A popup asked how.

## Considered Options

- The user chooses the version each time.
- A script bumps the version by SemVer part everywhere it appears.

## Decision Outcome

Chosen: A script bumps the version by SemVer part everywhere the version appears, and the agent runs it without being asked. Supersedes: none.

## Consequences

No release step relies on the agent's memory. A new script and its tests must be kept up to date.

Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/92c2d0ed-d53e-44cb-8e0e-be2c127d057d.jsonl:4111 (handoff of 2026-11-14, popup answer); user decision, 2026-11-14 14:36 UTC, the version bump is automatic (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:36849).
