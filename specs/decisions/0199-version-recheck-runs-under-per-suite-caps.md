---
status: proposed
date: 2026-11-24
---

# Version Recheck Runs Under Per-Suite Caps

## Context and Problem Statement

REQ-VERIFICATION-105 keeps a session's paid evals at or under $10, because eval runs spend the user's weekly usage. The 2026-11-24 goal message pinned the target to Claude Code 2.1.329, voided every Verified line from another version, and asked for the three eval suites to run whole, at once, each under its own `--max-cost-usd` cap, with paid runs allowed within those caps. Two of the suites cost $56.81 and $12.16 (RISK-540), so a full version recheck cannot fit in $10. Which cap holds for a session whose goal orders a full recheck on a newly pinned version?

## Considered Options

- Keep $10 for every session and split a version recheck across sessions.
- Let the goal that orders a version recheck set its caps: each suite runs under its own `--max-cost-usd`, and $10 holds for every other session.

## Decision Outcome

Chosen: the second option, as the smaller change that matches the goal message. A session whose goal orders a full recheck on a pinned version runs each paid suite under the cap that goal names per suite; the free route still comes first, and every paid run still sets `--max-cost-usd`. Every other session keeps the $10 cap of REQ-VERIFICATION-105.

The status stays `proposed` until the user reviews it; setting it to `rejected` brings back the plain $10 cap and reopens REQ-VERIFICATION-105 and RISK-540.

## Consequences

- REQ-VERIFICATION-105's acceptance names the exception, and RISK-540 closes on it.
- A version recheck still costs one full set of suites, which the user sees in their weekly usage.

Source: the user's goal message, 2026-11-24; REQ-VERIFICATION-105; RISK-540.
