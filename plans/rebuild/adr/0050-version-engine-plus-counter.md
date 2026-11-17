---
status: accepted
date: 2026-11-14
---
# Fault Fixes Ship As A +patch Release

## Context and Problem Statement

Dozens of faults wait for a plugin release on engine 2.1.325. Which kind of release carries them?

claudetto ran on the Claude Code 2.1.319 engine and carried version 2.1.319. A markup-only release on the same engine needs its own version.

## Considered Options

- A new engine version.
- A counter bump on the current engine.
- Reuse 2.1.319.
- Add a counter to the engine version, as in 2.1.319+1.

## Decision Outcome

Chosen: The fixes ship as a +patch counter bump on the current engine version.

A release for the same engine adds a counter to the engine version (`2.1.319+1`), and gets a `feat/*` branch and an initialised OpenSpec change. Later turns use the same form: `2.1.325+1`, `2.1.325+3`.

## Consequences

The tags `2.1.325+1` to `2.1.325+3` follow this form.

A fault fix on one engine ships as a patch counter; see the decision on +patch releases.

Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/294da1a9-e778-41e2-b2d4-d83e20be999a.jsonl:12 (user decision, 2026-11-14); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/4c68767f-62e8-43f8-a3c5-95dcd42c18d8.jsonl:9 (user decision, 2026-11-09).
