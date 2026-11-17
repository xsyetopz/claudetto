---
status: accepted
date: 2026-11-16 (date of the handoff that records it; day of decision not recorded)
---
# Dogfood After Each Commit

## Context and Problem Statement

The overnight goal set a rule: just dogfood after each commit and just dogfood-dir for uncommitted code; push after each green check, never force.

## Considered Options

- Dogfood at release.
- Dogfood after each commit.

## Decision Outcome

Chosen: after each commit; push after each green check; never force-push.

## Consequences

just check runs outside the sandbox.

Source: user decision, 2026-11-16 (date of the handoff that records it; day of decision not recorded) (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:473); (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:1281).
