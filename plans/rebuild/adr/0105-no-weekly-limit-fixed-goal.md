---
status: accepted
date: 2026-11-17
---
# No Weekly Limit; a Fixed Goal With a Fixed Outcome

## Context and Problem Statement

The user ruled out weekly limits for the agent and ruled out an unbounded goal. The goal has a fixed outcome: the stable 2.1.325 release of the plugin, with its design.md table, mutation scores, and a verdict on each external claim.

## Considered Options

- Keep the 25 percent weekly cap.
- Remove the cap and fix the outcome.

## Decision Outcome

Chosen: Remove the weekly-limit line and fix the outcome as the stable 2.1.325 release. Supersedes [ADR-0019](0019-paid-work-weekly-cap.md). The release target moved to 2.1.326 (user decision, 2026-11-16, `0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:10743`).

Paid runs follow [ADR-0045](0045-paid-runs-approved.md), by user decision on 2026-11-17 (asked through AskUserQuestion in session `0342617c`): a cheap paid probe runs without a new ask, and a bigger paid run waits for the user's word.

## Consequences

A cheap paid probe runs without a new ask; a bigger paid run needs the user's word first; the cost of each is reported after.

Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:7889 (the user's second-to-last prompt, relayed in the handoff).
