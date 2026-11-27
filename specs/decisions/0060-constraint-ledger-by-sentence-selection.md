---
status: superseded by ADR-0075
date: 2026-11-16
---
# Constraint Ledger by Sentence Selection

## Context and Problem Statement

The constraint ledger selected, never generated, the user's sentences: `Intl.Segmenter` split them (at most 41 per message, 8,606 Jev input tokens for 41), each tagged `restricts_<s>`, `rule_<s>` (`read-only`, `no-commit`, `no-push`, `only-files`, `no-questions`) or `lifts_<e>`. Only origin `composer`, `bridge` or `sdk` messages counted; `only-files` without a path gave `none`; a failed call kept the previous ledger; `prompt.submit` never waited.

## Considered Options

- Keep the ledger with `useConstraintPin` and `useAskFix`.
- Remove both and keep one classic `PreCompact` keep line.

## Decision Outcome

Chosen: Superseded: D323 removes `useConstraintPin` and `useAskFix`, because the ledger made a model call on every prompt and denied tool calls on a model's reading of old messages. The settled decision "no constraint ledger" holds. See constraint-ledger-removed-for-precompact-keep-line.

## Consequences

- Corrections survive compaction through the keep line only.
- The repo has no ledger code at 088a227c.

Source: openspec/specs/constraint-ledger/spec.md:78; openspec/changes/archive/2026-11-13-feat-2-1-321/tasks.md:64; openspec/changes/archive/2026-11-16-2-1-323/design.md:129.
