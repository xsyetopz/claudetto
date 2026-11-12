---
name: apply
description: Implement the tasks of an OpenSpec change. Use for "openspec apply", "opsx apply", or when the user says to continue a change's tasks.
---

The tool is `mcp__claudetto-openspec__openspec`. If its schema is not loaded, load it with ToolSearch `select:mcp__claudetto-openspec__openspec`.

1. Pick the change: the name the user gave, else the one change `{action:"status"}` lists. Several changes and no name: ask which.
2. Validate first: `{action:"validate", change}`. On any ERROR or WARNING, stop and name each issue (path and message), with no edit. The user fixes the change or runs the update skill.
3. `{action:"status", change}`. Read the files it lists (proposal, design, specs, tasks.md) before the first edit.
4. Work the unticked tasks in order. Keep each edit to what its task says. After a task is done, change its `- [ ]` to `- [x]` in tasks.md, in the same turn.
5. Stop when a task needs a decision, hits a denial, or needs something only the user can run. Wait there for the user's answer.

## Ending A Pause Or A Report

End every pause and every final report by copying each task you leave unticked as its `- [ ]` line, exactly as `tasks.md` has it, with the blocker beneath it. The blocker is one of:

- `! <command>` for the user to run, the exact command;
- the denial from this turn, quoted;
- an open question to the user.

Copy each task whole, so the user can match it to `tasks.md`. When none are left, say the change is done and name the verify skill.
