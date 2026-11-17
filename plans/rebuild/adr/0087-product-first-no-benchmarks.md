---
status: accepted
date: 2026-11-16
---
# Product First, No Benchmarks, No Planner, No Component Swaps

## Context and Problem Statement

Earlier sessions ran benchmark rounds (one cost $10.02), fixed the benchmark's transcript parser twice so scores would improve, ran mutation scoring, wrote unrequested tests, listed the whole current resource, mapped a planner, and swapped components. The goal stood at 21 of 22.

Transcript record tx-x01b/no-benchmarks-planner-inventory: The agent ran benchmarks, wrote needless tests, listed the whole current tree, and started a planner worker.

Transcript record tx-x02/no-benchmarks-planner-swaps: The agent built component swaps, needless tests, a listing of the current resources, benchmarks with gamed scores, and a planner, none asked for. It ran tests and checks over and over in place of building the product.

## Considered Options

- Keep measuring with benchmarks and mutation scores.
- Build the product first and run only the narrowest check.
- Keep these steps in the rebuild.
- Drop them; edit the tree directly.
- Build the rebuilt claudetto first and run only the narrowest check that proves a part works.
- Benchmark scores, mutation scoring, a planner agent, strangler swaps, needless tests.

## Decision Outcome

Chosen: Build the product first. Run only the narrowest check that proves a part works. No benchmarks, no planner, no component swaps, no needless tests, no resource inventories. Matches settled decisions of the plan; supersedes nothing.

## Consequences

Any plan item that proposes a benchmark, planner, or swap goes to scope Out.

Transcript record tx-x01b/no-benchmarks-planner-inventory decided: No benchmarks, no planner, no component swaps, no inventory of current files, no tests nobody asked for. The planner worker is stopped. Matches the settled decision of no benchmarks, no planner, and no component swaps. Good: effort goes to the tree. Bad: no stock-against-final table; the holdout set drawn earlier has no use.

Transcript record tx-x02/no-benchmarks-planner-swaps decided: product first, the rest later. No benchmark scores, gamed or otherwise. No planner. No strangler swap. No needless test. No listing of the current files. The holdout is not handed to the user. Supersedes `[ADR-0056](0056-benchmark-yardstick-goal.md)`. Mutation scoring and targets set to `pass: true` are named as past violations.

Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:3998; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:4166; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:4177; user decision, 2026-11-16; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:4057; user decision, 2026-11-16 (date of the handoff that records it; day of decision not recorded); user decision, 2026-11-16 (date of the handoff that records it; day of decision not recorded) (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:4204); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:5290; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:6352.
