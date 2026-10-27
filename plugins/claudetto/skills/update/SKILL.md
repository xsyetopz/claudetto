---
name: update
description: Revises the planning artifacts of a change and keeps them equal to each other, in artifacts only. Use when the user asks to revise a plan or to make it coherent.
disable-model-invocation: true
argument-hint: "[change]"
allowed-tools: Bash(minispec *)
---

Revise the artifacts that exist. Edit only artifacts.
Leave a missing artifact to `/claudetto:propose`.

1. Pick the change: `$ARGUMENTS`, the one that the talk names, or the one change of `minispec list --json`.
   Ask the user when more than one fits, with the most recent change first.
   In `claude -p`, take the first one. Say which change you took.
   Say "Using change: <name>".
2. Run `minispec status --change <name> --json`.
   Edit only the files of the artifacts with the status `done`. Read the `outputPath` of each in the change folder.
   Leave an artifact that is `skipped` as it is.
   For an artifact that is `ready` or `blocked`, tell the user to write it with `/claudetto:propose`.
3. Find the request.
   When the user names a revision, that revision is the first edit.
   When the user only says "update" or "make it coherent", read the artifacts.
   Check them against each other for contradictions, gaps, and repeats.
4. Draft the edit in the talk, so that the user agrees before a file changes.
   Check each other artifact against the draft in any direction.
   An edit of a later artifact can force a change of an earlier one.
   When the change is already coherent, say so. Leave the artifacts as they are.
   A `MODIFIED` requirement can rename a scenario of the main spec.
   Then write two bullets in the block, before the scenarios, so that `validate` and `archive` read the old scenario as renamed:
   ```text
   - RENAMED SCENARIO FROM: `#### Scenario: <old name>`
   - RENAMED SCENARIO TO: `#### Scenario: <new name>`
   ```
   The new scenario must be in the block. The archive removes the two bullets from the main spec.
5. Show each edit with its reason. Write it only after the yes of the user.
   In `claude -p`, a revision that the prompt names is that yes. Each other edit goes in the report as a proposal.
   Leave the file as it is after a no.
   A change that already has a spec can get a new `specs/<capability>/spec.md`. Use a path that is free, and ask first.
6. Run `minispec validate <name> --strict`. Fix each issue that your edit caused.
7. When the request changes the intent of the change, ask for a new name. Propose `minispec new change <name>` for it.
   A request that refines the intent stays in this change.
8. Report the artifacts that you revised, the edits that the user rejected, and what you left for later.
   End with the next command as a line to the user.
   Use `/claudetto:apply` when a task is open and the code can lag the new plan.
   Use `/claudetto:archive` when each task is done.
