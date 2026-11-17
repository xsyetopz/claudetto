---
status: superseded by ADR-0105
date: 2026-11-16
---
# Ask Before A Paid Call And Cap Paid Work At 25 Percent Of The Seven-Day Limit

## Context and Problem Statement

Paid runs were approved only when done cheaply; the user asked to be asked before any paid arm. The overnight goal capped paid work at 25% of the seven-day limit.

Transcript record tx-x03/stop-paid-work-past-25-percent-of-seven-day-limit: The standing goal told the agent to do free work only past 25 percent of the seven-day usage limit.

## Considered Options

- Spend without asking.
- Ask before a paid arm; free work only past 25% of the seven-day limit.
- Cap paid work at 25 percent of the weekly limit.
- Drop the weekly limit and fix the goal.

## Decision Outcome

Chosen: ask first, and free work only past 25%.

## Consequences

Fake-API probes are free.

Transcript record tx-x03/stop-paid-work-past-25-percent-of-seven-day-limit decided: Cap paid work at 25 percent of the seven-day limit. Superseded on 2026-11-16 by [ADR-0105](0105-no-weekly-limit-fixed-goal.md). The agent tracked a seven-day share in each report.

Source: user goal set through `/goal`, 2026-11-16 06:24 UTC, past 25 percent of the seven-day limit, free work only (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:11); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:2677 (standing goal lines).
