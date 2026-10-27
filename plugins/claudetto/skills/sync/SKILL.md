---
name: sync
description: Merges the delta specs of a change into `openspec/specs/` and leaves the change in place. Use when the main specs must show a change before its archive.
disable-model-invocation: true
argument-hint: "[change]"
allowed-tools: Bash(minispec *)
---

The command does the merge, so leave each spec file to it.

1. Pick the change: `$ARGUMENTS`, the one that the talk names, or the one change of `minispec list --json` that has files in `specs/`.
   Ask the user when more than one fits.
   In `claude -p`, take the first change of `minispec list` (the newest). Say which change you took.
   Say "Using change: <name>".
2. Run `minispec validate <name> --strict`.
   When it fails, show each issue. Then stop, because the merge would refuse the change.
3. Run `minispec sync <name>`.
   It merges each `specs/<capability>/spec.md` of the change into `openspec/specs/<capability>/spec.md`.
   It merges in the order `ADDED`, `MODIFIED`, `REMOVED`, `RENAMED`.
   It writes files only when each delta applies.
   When the command fails, show the error with its fix. The main spec stays as it is.
   A second run gives the same result.
4. Read each main spec that changed.
   Check that the `## ADDED Requirements` header and each other delta header are gone from it.
5. Report the capabilities that changed, with the requirements that were added, modified, removed, or renamed.
   A new main spec has the `## Purpose` of the delta.
   Tell the user when that `## Purpose` is a short placeholder to write now.
6. Say that the change stays active. End with `/claudetto:archive` as the command for when the work is done.
