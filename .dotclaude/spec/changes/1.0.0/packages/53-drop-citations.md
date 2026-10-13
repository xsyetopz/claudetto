---
schema: dotclaude-spec/2
kind: package
id: P53
title: Drop the Code Citations
wave: 10
deps: ["P52"]
owns: ["src/plugins/dotclaude/slices/spec/","tests/dotclaude/spec/",".dotclaude/spec/changes/1.0.0/design-spec.md"]
satisfies: []
verify: just check
agent: main session
status: done
---

## Goal

dotclaude keeps the stable `REQ-<n>` IDs, and code cites no requirement, because the uncited form gives more consistent output (the user, 2026-10-13).

## Context

- arXiv 2606.30689, Table 1: the mean LSS of the uncited condition is higher than the cited one, 0.745 against 0.535 for Claude and 0.644 against 0.510 for GLM.
- The cost: the orphan check needs citations, so it finds no made-up ID (Table 3).

## Steps

1. Remove `dotclaude-spec trace`, `domain/trace.ts`, `adapters/trace.ts`, and their tests.
2. The `accept` gate needs only that each package is `done` or `canceled`.
3. Remove the citation rule from the skills `implement`, `review`, and `accept`.
   The `reviewer` still checks that the code does what each requirement in `satisfies` says.
4. Update the sections Code Citations, Change States, and Commands of `design-spec.md`.

## Acceptance

- `just check` passes, and no source, skill, or test names `trace` or a citation.

## Boundaries

- Keep the `REQ-<n>` IDs, `satisfies`, and the `[NEEDS CLARIFICATION: ...]` marker.
