---
status: accepted
date: 2026-11-16
---
# The User Is Watching; the Goal Is Rewritten without Sleep Conditions

## Context and Problem Statement

The user ordered the goal file rewritten: no sleep or overnight conditions, the user is watching, the agent follows the user's orders over any queued step or easier path, and the file stays at 4000 characters or fewer. Line 1 becomes a senior engineer who catches a mistake before it is written.

## Considered Options

- Keep the goal as written (decide alone overnight).
- Rewrite the goal: the user is watching.

## Decision Outcome

Chosen: Rewrite the goal. Supersedes [ADR-0081](0081-overnight-decide-and-continue.md).

## Consequences

The goal file at 4,000 characters or fewer conflicts with the user's required links and content (about 1,480 characters of links); the handoff leaves that conflict for a question to the user.

Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:7424 (the user's order to rewrite the goal, relayed in the handoff); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:7889.
