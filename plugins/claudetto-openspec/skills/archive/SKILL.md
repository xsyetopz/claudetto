---
name: archive
description: Archive a finished OpenSpec change and merge its delta specs into openspec/specs. Use for "openspec archive", "opsx archive", or "openspec sync".
---

The tool is `mcp__claudetto-openspec__openspec`.

1. Pick the change: the name the user gave, else ask from `{action:"status"}`.
2. Call `{action:"archive", change}`. It validates strictly, refuses a change with an unticked task, computes every merge, moves the change to `openspec/changes/archive/YYYY-MM-DD-<name>`, then writes the merged specs. It merges and archives in one step, so a sync is this same call.
3. If it refuses, nothing changed. Show the refusal, fix its cause (finish or remove the task, correct the delta), and call it again; a ticked task is the way through.
4. On success report the archive path and which `openspec/specs/<capability>/spec.md` files changed.
