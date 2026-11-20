---
status: accepted
date: 2026-11-16
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

Source: user goal set through `/goal`, 2026-11-16 15:28 UTC, dogfood and push after each green commit (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:13).
