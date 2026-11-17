---
status: superseded by ADR-0025
date: recorded in openspec/specs/surface-trim/spec.md:147 (day of decision not recorded)
---
# Built-In Agent Offer and Mapping

## Context and Problem Statement
Route A: `agent.offer` withholds the built-ins and `tool.call` maps `Explore` to `claudetto:Artemis`, `Plan` to `claudetto:Metis`, and `general-purpose`, `claude`, or a missing type to `claudetto:Heracles`; `fork` passes; others fail "not found"; `run_in_background:false` is carried unless set.

## Considered Options
- Map built-in agents to claudetto agents.
- Deny with the exact form rather than rewrite.
- Let agent calls reach Claude Code unchanged.

## Decision Outcome
Chosen: Superseded by D323 (agent calls reach Claude Code unchanged). Reason kept: a deny rule would refuse, and a rewrite voids auto review.

## Consequences
- Baseline keeps the mapping in plugins/claudetto/hooks/features/delegation/ with tests.

Source: openspec/specs/surface-trim/spec.md:147; plugins/claudetto/hooks/features/delegation@088a227c. Basis: inferred. Status: have at 088a227c. Not located: tags C:63, B:214, D:285.
