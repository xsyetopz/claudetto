---
name: sync
description: Merges the delta specs of a change into `openspec/specs/` with no archive, and leaves the change in place.
disable-model-invocation: true
argument-hint: "[change]"
allowed-tools: Bash(minispec *)
---

The command does the merge, so edit no spec file by hand.

1. Pick the change: `$ARGUMENTS`, the one that the talk names, or the one change of `minispec list --json` that has files in `specs/`.
   Ask the user when more than one fits.
   Say "Using change: <name>".
2. Run `minispec validate <name> --strict`.
   When it fails, show each issue and stop, because the merge would refuse it.
3. Run `minispec sync <name>`.
   It merges each `specs/<capability>/spec.md` of the change into `openspec/specs/<capability>/spec.md`, in the order `ADDED`, `MODIFIED`, `REMOVED`, `RENAMED`, and it writes no file when one delta fails.
   Show the error of a failure with its fix, and keep the main spec as it is.
   A run twice gives the same result.
4. Read each main spec that changed, and check that no `## ADDED Requirements` header or other delta header is left in it.
5. Report the capabilities that changed, with the requirements that were added, modified, removed, or renamed.
   A new main spec has the `## Purpose` of the delta, so tell the user when it is a short placeholder to write now.
6. Say that the change stays active, and end with `/claudetto:archive` as the command for when the work is done.
