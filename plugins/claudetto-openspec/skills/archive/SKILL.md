---
name: archive
description: Archive a finished OpenSpec change and merge its delta specs into openspec/specs. Use for "openspec archive", "opsx archive", or "openspec sync".
---

The tool is `mcp__claudetto-openspec__openspec`.

1. Pick the change: the name the user gave, else ask from `{action:"status"}`.
2. Call `{action:"archive", change}`. It validates strictly, refuses a change with an unticked task, computes every merge, moves the change to `openspec/changes/archive/YYYY-MM-DD-<name>`, then writes the merged specs. It merges and archives in one step, so there is no separate sync.
3. If it refuses, nothing changed. Show the refusal and stop. Fix the cause (finish or remove the task, correct the delta) and call it again. No option overrides an open task.
4. On success report the archive path and which `openspec/specs/<capability>/spec.md` files changed.
