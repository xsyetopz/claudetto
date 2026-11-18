---
status: accepted
date: no source line located (day of decision not recorded)
---
# Remove the Linter Unsafe-Fix Rule

## Context and Problem Statement
Should a patch rule deny linter fixes that rewrite code unsafely?

## Considered Options
- Keep `claudetto:lint-unsafe-fix`.
- Remove the rule and the generated rules.

## Decision Outcome
Chosen: remove the rule and the generated rules (the plan states the 2026-11-16 change removes them).

## Consequences
- Missing at 088a227c: the rule is absent from plugins/.

Source: openspec/changes/archive/2026-11-16-2-1-323/specs/dangerous-commands/spec.md:29@088a227c9^ (the patch rule is deleted with the gate and its patch file); the rule came from openspec/changes/archive/2026-11-10-release-2-1-319-1/specs/dangerous-commands/spec.md:3@088a227c9^.
