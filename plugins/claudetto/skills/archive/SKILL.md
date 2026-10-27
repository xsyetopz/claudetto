---
name: archive
description: Merges the delta specs of a finished change into `openspec/specs/`, and moves the change to `openspec/changes/archive/`. Use after `/claudetto:verify` shows no gap.
disable-model-invocation: true
argument-hint: "[change]"
allowed-tools: Bash(minispec *)
---

1. Pick the change: `$ARGUMENTS`, or the one change of `minispec list` with each task done.
   Ask the user when more than one fits.
   In `claude -p`, list the changes that fit. Then stop, because an archive is hard to undo.
2. Run `minispec archive <name>`.
   It validates the change, merges its delta specs, and moves it to `openspec/changes/archive/<date>-<name>/`.
3. When the command stops on open tasks, ask the user.
   Run `minispec archive <name> --yes` only after their yes.
   In `claude -p`, report the open tasks. Then stop.
4. Report the specs that changed and the archive folder.
