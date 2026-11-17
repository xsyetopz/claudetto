---
status: accepted
date: no source line located (day of decision not recorded)
---
# Remove The Linter Unsafe-Fix Rule

## Context and Problem Statement
Should a patch rule deny linter fixes that rewrite code unsafely?

## Considered Options
- Keep `claudetto:lint-unsafe-fix`.
- Remove the rule and the generated rules.

## Decision Outcome
Chosen: remove the rule and the generated rules (the plan states the 2026-11-16 change removes them).

## Consequences
- Missing at 088a227c: the rule is absent from plugins/.

Source: unresolved: no source line holds the removal; the plan line cites the 2026-11-16 change.
