---
status: superseded by ADR-0031
date: 2026-11-05
---

# Replace Monitor with a Claudetto Tool and Deny the Built-In

## Context and Problem Statement

`tool.describe` cannot cut Monitor enough. Which route do the user's answers of 2026-11-05 choose?

## Considered Options

- Trim stock Monitor (mt1: 1,960 bytes, -74%, no loss). By the acceptance rule the trim is canonical, which conflicts with an earlier decision and with goal item 4. Tasks 5.17 (replace) and 5.17a (trim) were written; only the user's choice ships.
- Replace Monitor with a small claudetto MCP tool `monitor` and deny the built-in through `permissions.deny` "Monitor" (`mcp__claudetto__monitor` plus the deny from `claudetto:setup`).
- Defer stock Monitor.

## Decision Outcome

Chosen: D2, replace and deny, not deferral. The user's condition on 2026-11-05: replace only if the two costs (in-turn delivery and the completion notice) reach 0. Both reached 0 (probes mon14-mon20), so the user's choice was 5.17, the replacement; 5.17a was removed. If the costs could not be cut, the user's fallback was to keep the built-in, trim it, and defer it when that causes no problem. Paid running total at the choice: $11.84.

## Consequences

Remaining losses: user-turn framing, no ws source, no 100-message cap. Later superseded by the wrapper route, which needs no deny rule.

Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2062; openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2122; openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2760; openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2808; openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:3262; user decision, 2026-11-05.
