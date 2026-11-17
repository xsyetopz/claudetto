---
status: superseded by ADR-0052
date: recorded in openspec/specs/decide/spec.md:153 (day of decision not recorded)
---
# Rebuild the Advisor Tool and Command

## Context and Problem Statement
The built-in advisor tool was replaced by `mcp__claudetto__advisor` and `/claudetto:advisor`, sharing one function that made one `$.model.complete` at `high` effort on Fable (`claude-fable-5-2`).

## Considered Options
- Keep the rebuilt advisor.
- Delete it and keep the built-in disabled.

## Decision Outcome
Chosen at the time: keep the rebuilt advisor. Superseded by [ADR-0052](0052-advisor-tool-disabled.md).

## Consequences
- Each advisor question paid full input price on Fable.

Source: openspec/specs/decide/spec.md:153 (the rebuilt advisor requirement at 088a227c^).
