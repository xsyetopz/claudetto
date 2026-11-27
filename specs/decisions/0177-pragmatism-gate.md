---
status: accepted
date: 2026-11-18
---
# A Component Ships Only When It Beats Vanilla

## Context and Problem Statement

Opus 5.5, Sonnet 5.5 and Haiku 5.5 already do much of what plugin scaffolding once added: they read, plan, verify and summarise on their own, and Claude Code 2.1.327 already reuses the cached prefix in `/compact` (chunk-m14bt1pz.js@2958807). A framework layered on top costs context, cache writes and maintenance, and can hold the model back. The user asked for pragmatic means only, and for no framework that handicaps the models. Which components does claudetto keep?

## Considered Options

- Keep every planned component that has a source.
- Keep a component only when it beats vanilla Claude Code plus the model on a measured check; move the rest to `prd/README.md` scope Out with the reason.

## Decision Outcome

Chosen: the measured check. A component states the vanilla behaviour it improves on, the check that shows the difference (a probe, a transcript count, a behavioural test with N runs per arm), and the observed result. A component with no such result is not built. The check is an acceptance test for one component, not a benchmark score or a target to tune toward ([ADR-0087](0087-product-first-no-benchmarks.md) stands).

## Consequences

- Good: fewer tokens in the prefix, fewer hooks on the hot path, less to break on each Claude Code release.
- Bad: each kept component needs a measurement before it ships, which costs runs.
- Built-in features win ties: auto compaction, `/clear`, checkpoints, `MAX_MCP_OUTPUT_TOKENS`, `bashOutputMaxChars`, and the model's own planning.
- Strongest counterargument: a measured check per component is itself overhead. It is limited to components that add prefix text, a hook on every tool call, or a model call; a setting key written by setup needs only a probe that the key takes effect.

Source: user decision, 2026-11-18 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/2cf55002-c3a4-457f-b01c-e854d76d621e.jsonl:272); reports/2026-11-18-research/handover.md:9 and :65-70 (built-in features that already cover the handover case, claude 2.1.327).
