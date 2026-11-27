---
status: superseded by ADR-0195
date: 2026-11-18
---
# Target Claude Code 2.1.327

## Context and Problem Statement

The plan targeted Claude Code 2.1.326. Version 2.1.327 is installed (`~/.local/share/claude/versions` holds 2.1.323, 2.1.325, 2.1.326 and 2.1.327) and fixes four compaction faults: a reply cut at max output no longer loses its tool call (chunk-4xhk2fyb.js:8257), Edit after compaction no longer fails with "File has not been read yet" (chunk-p47p1nn1.js:35142), compaction replies with many unclosed tags no longer stall (chunk-m14bt1pz.js@2714576), and teammates on another model compact at their own limit (chunk-m14bt1pz.js@2530073). Which version does the plan verify against?

## Considered Options

- Keep 2.1.326.
- Move to 2.1.327.

## Decision Outcome

Chosen: 2.1.327. Each fact the plan relies on is verified against 2.1.327; a fact measured on an earlier version says so in its Basis line.

## Consequences

- Facts measured on 2.1.326 stay valid only until a 2.1.327 probe or code read confirms them; minified names and chunk offsets differ between versions, so a re-check follows literal anchors.
- The four compaction fixes remove failure modes that a custom handover would otherwise work around, which weakens the cost case for replacing compaction ([ADR-0178](0178-renewal-at-task-boundaries.md)).

Source: user decision, 2026-11-18 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/2cf55002-c3a4-457f-b01c-e854d76d621e.jsonl:7); reports/2026-11-18-research/handover.md:32 (cc-inspect `release notes`, claude 2.1.327, 2026-11-18).
