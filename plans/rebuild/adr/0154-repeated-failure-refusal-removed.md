---
status: accepted
date: recorded in openspec/specs/run-limits/spec.md:19 (day of decision not recorded)
---
# Refuse Repeated Failures

## Context and Problem Statement
After the same call fails `failLimit` times with the same error, run-limits refused an identical retry with the earlier error as reason (a user interrupt is not a failure; a call without `tool_use_id` is never held). D323 found its text appears in no transcript, so it never fired.

## Considered Options
- Keep the run-limits refusal.
- Remove it.

## Decision Outcome
Chosen: remove it. Prefer D323.

## Consequences
- No fail-limit hold exists after the rebuild.

Source: openspec/specs/run-limits/spec.md:19; not located: the D323 line stating it never fired.
