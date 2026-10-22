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
5. Stop at a blocker, and ask the user.
6. When each task is ticked, point the user to `/claudetto:verify`.
