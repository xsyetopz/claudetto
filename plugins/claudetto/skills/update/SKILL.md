---
name: update
description: Revises the planning artifacts of a change and keeps them equal to each other, with no code edit.
disable-model-invocation: true
argument-hint: "[change]"
allowed-tools: Bash(minispec *)
---

Revise the artifacts that exist, and edit only artifacts.
This skill creates no missing artifact.

1. Pick the change: `$ARGUMENTS`, the one that the talk names, or the one change of `minispec list --json`.
   Ask the user when more than one fits, with the most recent change first.
   Say "Using change: <name>".
2. Run `minispec status --change <name> --json`.
   Edit only the files of the artifacts with the status `done`, and read the `outputPath` of each in the change folder.
   Leave an artifact that is `skipped` as it is.
   For an artifact that is `ready` or `blocked`, tell the user to write it with `/claudetto:propose`.
3. Find the request.
   When the user names a revision, that revision is the first edit.
   When the user only says "update" or "make it coherent", read the artifacts and check them against each other for contradictions, gaps, and repeats.
4. Draft the edit in the talk, not in files.
   Check each other artifact against the draft in any direction, because an edit of a later artifact can force a change of an earlier one.
   When the change is already coherent, say so and propose no edit.
5. Show each edit with its reason, and write it only after the yes of the user.
   Leave the file as it is after a no.
   For a new `specs/<capability>/spec.md` in a change that already has a spec, use a path that is free, and ask first.
6. Run `minispec validate <name> --strict`, and fix each issue that your edit caused.
7. When the request changes the intent of the change, ask for a new name, and propose `minispec new change <name>` for it. A request that refines the intent stays in this change.
8. Report the artifacts that you revised, the edits that the user rejected, and what you left for later.
   End with the next command as a line to the user: `/claudetto:apply` when a task is open and the code can lag the new plan, and `/claudetto:archive` when each task is done.
