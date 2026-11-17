---
status: superseded by ADR-0153
date: 2026-11-13
---
# Linter Unsafe-Fix Rule

## Context and Problem Statement
`oxlint --fix-suggestions` deleted 81 `console.log` calls and `async` on 8 functions (reproduced).

## Considered Options
- No rule.
- Rule `claudetto:lint-unsafe-fix`.

## Decision Outcome
Chosen then: the rule denies `oxlint`, `biome`, and `ruff` (bare, with an `@version` suffix, or as a package-manager run script) with `--fix-suggestions`, `--fix-dangerously`, `--unsafe`, or `--unsafe-fixes`; safe `--fix`, `--write`, and `--help` pass; the denial points to a safe `--fix` plus Edit.

## Consequences
- Missing at 088a227c (no `lint-unsafe` in plugins/).

Source: openspec/specs/dangerous-commands/spec.md:92; openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:567.
