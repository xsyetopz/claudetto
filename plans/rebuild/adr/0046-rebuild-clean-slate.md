---
status: accepted
date: 2026-11-14
---
# Rebuild from a Clean Slate

## Context and Problem Statement

Claudetto fails at runtime, not in CI. Patch the current architecture or rebuild?

Transcript record tx-x01b/rebuild-top-down-clean-tree: After 2 hours of work the diffs showed no progress on the cleanup the user asked for. The user told the agent to read what was said and rebuild.

Transcript record tx-x03/clean-slate-rebuild: While the agent worked, the user asked for the architecture to be cleaned up. The agent kept patching old paths and files in place; the user paused it and repeated the order.

## Considered Options

- Patch the current code and architecture.
- Rebuild by subagents on enterprise practices, from a clean slate, for 2.1.325, with no feature loss.
- Component swaps behind a benchmark, with plans and inventories.
- Rebuild claudetto from scratch, top to bottom, as a clean tree.
- Patch the existing architecture in place.
- Write each part new, delete the old path with its tests, settings, and docs, and keep a part only for a measured reason.

## Decision Outcome

Chosen: Rebuild from a clean slate; never engineer around the old code. A replaced path is deleted with its tests, settings, and docs.

## Consequences

Features stay; code shrinks.

Transcript record tx-x01b/rebuild-top-down-clean-tree decided: Rebuild claudetto top down from `plugins/claudetto/.claude-plugin/plugin.json` and the hook entry point, then hooks, scripts, statusline, rules, agents, output style, commands, and skills; then `claudetto-openspec`, `claudetto-you-should-know`, `tools/`, and `tests/`. Delete the old code as the new tree replaces it. Supersedes [ADR-0090](0090-rebuild-by-component-swap-behind-benchmark.md). Good: the asked cleanup proceeds. Bad: the old item list (21 of 22 done) no longer measures the work.

Transcript record tx-x03/clean-slate-rebuild decided: Rebuild from a clean slate: write each part new, delete the old path with its tests, settings, and docs, patch nothing in place, and delete each part with no measured reason to exist. The committed in-place prompt patches stay only until the rebuild replaces them. This plan (plans/rebuild) is that rebuild; each requirement carries its source.

Source: user decision, 2026-11-14 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:12); user decision, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:10928); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:4057 (the user's words in the handoff); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:7424 (the user's pause, relayed in the handoff); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:7889 (Decisions).
