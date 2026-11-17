---
status: superseded by ADR-0087
date: 2026-11-16 (date of the handoff that records it; day of decision not recorded)
---
# Judge Claudetto By A Headless Stock-Against-Dev Benchmark

## Context and Problem Statement

The overnight `/goal` asked for a headless benchmark on real repos, stock Claude Code against the dev build, with hidden tests, cache hit rate, tokens, wall time, compactions, rereads, subagent length, conduct markers, and mutation scores in a table in `design.md`.

## Considered Options

- Benchmark on real repos with SWE-bench style tasks and a rerun after each change.
- No benchmark.

## Decision Outcome

Chosen: Chosen at the time: the benchmark, with "done" meaning a measured table where the final build beats stock on hidden tests and each target, or the row says why not.

## Consequences

Later reversed by the user the same day: benchmarks are out. Round 1 (6 tasks, both arms) and the tools/bench code belong to the superseded decision.

Source: user decision, 2026-11-16 (date of the handoff that records it; day of decision not recorded) (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:473); superseded by user decision, 2026-11-16 (date of the handoff that records it; day of decision not recorded) (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:4204); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:473; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:1281; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:2031.
