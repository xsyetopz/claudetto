---
name: apply
description: Does the open tasks of a change in `openspec/changes/<name>/tasks.md`, and ticks each one when its check passes.
disable-model-invocation: true
argument-hint: "[change]"
allowed-tools: Bash(minispec *)
---

1. Pick the change: `$ARGUMENTS`, or the one change of `minispec list` with open tasks.
   Ask the user when more than one fits.
2. Run `minispec status --change <name> --json`.
   When an artifact of `apply.requires` is not `done`, tell the user to finish it with `/claudetto:propose`, and stop.
3. Read each file of the change, and follow `apply.instruction`.
4. Do the open tasks in order, and change `- [ ]` to `- [x]` when the check of the task passes.
   After each task, start the next task in the same turn, until each task is ticked.
5. Pause, and ask the user with `AskUserQuestion`, only when one of these stops a task:
   - The task is not clear.
   - The work shows a fault in the design, so an artifact needs a change.
   - The task needs work that is outside the specs and tasks, or it fits only when you drop, narrow, or defer specified behavior.
   - An error or a blocker stays after you try to fix it.
6. End the report with the cost of the session and the change of each plan share since the start of the work, such as `+11%` for the 5-hour share.
   Take the figures from the cost line that each tick of a box in `tasks.md` adds to the context, and give the cost only when the login has no plan shares.
7. When each task is ticked, end the report with this line to the user, as the last line:
   `Next: /claudetto:verify`.
   After a stop at a blocker, end with the open task and `Next: /claudetto:apply`.
