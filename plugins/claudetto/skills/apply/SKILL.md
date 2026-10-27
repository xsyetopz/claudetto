---
name: apply
description: Does the open tasks of a change in `openspec/changes/<name>/tasks.md`, and ticks each one when its check passes. Use after `/claudetto:propose` finishes the artifacts of the change.
disable-model-invocation: true
argument-hint: "[change]"
allowed-tools: Bash(minispec *)
---

1. Pick the change: `$ARGUMENTS`, or the one change of `minispec list` with open tasks.
   Ask the user when more than one fits.
   In `claude -p`, take the first change of `minispec list` (the newest). Say which change you took.
2. Run `minispec status --change <name> --json`.
   When an artifact of `apply.requires` is not `done`, tell the user to finish it with `/claudetto:propose`. Then stop.
3. Read each file of the change. Obey `apply.instruction`.
4. Do the open tasks in order.
   Change `- [ ]` to `- [x]` when the check of the task passes.
   After each task, start the next task in the same turn. Continue until each task is ticked.
5. Pause and ask the user only when one of these stops a task.
   Use `AskUserQuestion` when your tools have it. When they do not, as in `claude -p`, end the report with the blocker.
   - The task is not clear.
   - The work shows a fault in the design, so an artifact needs a change.
   - The task needs work that is outside the specs and tasks.
   - The task fits only when you drop, narrow, or defer specified behavior.
   - An error or a blocker stays after you try to fix it.
6. End the report with the cost of the session and the change of each plan share since the work started.
   An example is `+11%` for the 5-hour share.
   Take the figures from the cost line. Each tick of a box in `tasks.md` adds this line to the context.
   Give the cost only when the login has no plan shares.
7. When each task is ticked, make this line the last line of the report to the user:
   `Next: /claudetto:verify`.
   After a stop at a blocker, end with the open task and `Next: /claudetto:apply`.
