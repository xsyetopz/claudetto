---
status: accepted
date: recorded in openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1702 (day of decision not recorded)
---

# A Disabled Tool Gets a Deny Rule

## Context and Problem Statement

How does claudetto disable a tool such as `ScheduleWakeup` or `ReportFindings`?

## Considered Options

- Defer the tool.
- Add a `permissions.deny` rule that removes the tool from the request.

## Decision Outcome

Chosen (user decision, 2026-11-04): a tool claudetto disables gets a deny rule that removes it from the request. Deferral is not enough, because a deferred tool still exists and can be called. `ScheduleWakeup` and `ReportFindings` are denied. a probe or item measured the deny removal (`t-deny-wake`, `t-deny-report`).

## Consequences

Each tool claudetto disables is listed in `permissions.deny`.

Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1702.
