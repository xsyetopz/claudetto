---
status: superseded by ADR-0046
date: 2026-11-16
---
# Rebuild by Component Swap behind a Benchmark

## Context and Problem Statement

How is claudetto rebuilt from the dossier? The goal text lays out the method.

## Considered Options

- Per component, a new path from its recipe, swapped one per commit behind a benchmark and tests (strangler fig), then the old part deleted.
- Rebuild the whole tree top down.

## Decision Outcome

Chosen: Per component, a new path at the highest rung that holds, swapped one per commit behind a benchmark and tests, then the old part deleted. The goal text adds a benchmark (pinned repos with 1,000 stars or more, merged bug-fix PRs, stock against dev, headless, same model and effort), frozen evals (tasks, scaffold, graders, and criteria before run 1; a failing run is a result; the tested agent cannot write graders, hidden tests, holdout, or results), and a holdout scored once.

## Consequences

Good: each swap has a measured reason. Bad: hours of benchmark work and no change to the tree; the user later ruled it out ([ADR-0046](0046-rebuild-clean-slate.md)).

Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:490 (goal text, verbatim in the handoff); user decision, 2026-11-16 17:37 UTC, no swaps, no needless tests, no benchmarks, no planner worker (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:3998); user decision, 2026-11-16 17:41 UTC, product first, the rest later (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:4166).
