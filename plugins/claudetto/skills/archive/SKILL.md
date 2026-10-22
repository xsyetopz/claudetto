---
name: archive
description: Merges the delta specs of a finished change into `openspec/specs/`, and moves the change to `openspec/changes/archive/`.
disable-model-invocation: true
argument-hint: "[change]"
allowed-tools: Bash(minispec *)
---

1. Pick the change: `$ARGUMENTS`, or the one change of `minispec list` with each task done.
   Ask the user when more than one fits.
2. Run `minispec archive <name>`.
   It validates the change, merges its delta specs, and moves it to `openspec/changes/archive/<date>-<name>/`.
3. When it stops on open tasks, ask the user.
   Run `minispec archive <name> --yes` only after their yes.
4. Report the specs that changed and the archive folder.
