---
status: superseded by ADR-0105
date: 2026-11-09 (date of the handoff that records it; day of decision not recorded)
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

Source: user decision, 2026-11-09 (date of the handoff that records it; day of decision not recorded) (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/60a81b6a-7024-4fb4-9f19-6d79c0fd6d65.jsonl:11); (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/638670c4-640d-44ab-83a2-436d1d918089.jsonl:11); user decision, 2026-11-16 (date of the handoff that records it; day of decision not recorded) (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:473); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:2677 (standing goal lines).
