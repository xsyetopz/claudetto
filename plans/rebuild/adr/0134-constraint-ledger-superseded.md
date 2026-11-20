---
status: superseded by ADR-0075
date: recorded in openspec/specs/constraint-ledger/spec.md (day of decision not recorded)
---
# Keep a Constraint Ledger

## Context and Problem Statement

D321 kept constraints taken from the user's words in a ledger that rode each prompt, with runtime enforcement, a no-questions hold on ask tools, each-constraint-quotes, and a resumed-session ledger wait.

## Considered Options

- Keep the ledger.
- Remove the ledger and keep only a `PreCompact` keep text.

## Decision Outcome

Chosen at the time: keep the ledger. Superseded by constraint-ledger-removed.

## Consequences

- The ledger made a model call on every prompt.

Source: openspec/specs/constraint-ledger/spec.md (the ledger spec at 088a227c^).
