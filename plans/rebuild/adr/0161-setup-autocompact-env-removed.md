---
status: superseded by ADR-0131
date: recorded in openspec/changes/archive/2026-11-16-2-1-323/design.md:131 (day of decision not recorded)
---

# Setup No Longer Writes Auto-Compact Overrides

## Context and Problem Statement

D323 removed the permission-policy gate rules, `useConstraintPin` and `useAskFix`, the idle-time temp rule, and setup writing `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=50` with `autoCompactWindow:300000`, which compacted every 140-150k tokens (measured).

## Considered Options

- Keep setup writing the override and window.
- Stop writing them.

## Decision Outcome

Chosen option: stop writing them.

## Consequences

Good: no compaction every 140-150k tokens. Bad: none known; the "140-150k" figure was not located by grep.

Source: openspec/changes/archive/2026-11-16-2-1-323/design.md:131; openspec/changes/archive/2026-11-16-2-1-323/design.md:137.
