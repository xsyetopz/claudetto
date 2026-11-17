---
status: accepted
date: recorded in plugins/claudetto/hooks/features/surface/surface.ts@088a227c (day of decision not recorded)
---

# Tool Trimming by Deferral

## Context and Problem Statement

Which tools are deferred behind ToolSearch to shrink the first request.

## Considered Options

* Defer Skill, Workflow, ScheduleWakeup, ReportFindings (our text if shorter) only when the session has ToolSearch, and keep Read, Write, and ListAgents loaded.
* Also defer Read, Write, and ListAgents (the earlier draft: first request tools 29,295 to 7,633 bytes, root prompt 5,218 to 4,443).

## Decision Outcome

Chosen: the first option (the later design keeps them loaded in full). A flag set later would send a tool deferred from request 2 and rewrite the cache (measured: the first tool flips and re-writes 3.9k tokens on turn 1, 2.1.319). `ListAgents` keeps its stock rows (a `$.agent.list` rebuild loses local, cloud, and Remote Control rows). Task tools get shorter texts with schemas unchanged.

### Consequences

Deferring `ListAgents` made the model say it had no tool (reach 0/8 against 8/8).

### Confirmation

A test asserts the deferred set when ToolSearch is listed and the full list when it is not.

## More Information

Basis: measured. Status: partial at 088a227c (`plugins/claudetto/hooks/features/surface/surface.ts`).

Source: plugins/claudetto/hooks/features/surface/surface.ts@088a227c.
