---
status: accepted
date: 2026-11-13
---

# Replace the Time-Cap Hook With the Stall Timeout

## Context and Problem Statement

The deleted time-cap hook counted run time and so refused calls of agents still making progress. What ends a stuck agent instead?

## Considered Options

- Keep the time-cap hook.
- Set CLAUDE_ASYNC_AGENT_STALL_TIMEOUT_MS, which counts silence and not run time.

## Decision Outcome

Chosen option: CLAUDE_ASYNC_AGENT_STALL_TIMEOUT_MS. 43 denials of an agent past 15 minutes are recorded (measured), which is the reason the hook goes.

## Consequences

- An agent that keeps working is not stopped by run time.
- Supersedes [ADR-0165](0165-time-cap-hook.md).
- The plan holds the key and that it counts silence (plans/rebuild-curation.md:1246); the 43 denials were not in it.

Source: openspec/changes/archive/2026-11-13-feat-2-1-321/specs/run-limits/spec.md:166.
