---
name: explore
description: Thinks through an idea, a problem, or an open decision of a change with the user, and writes no code.
disable-model-invocation: true
argument-hint: "[change or idea]"
allowed-tools: Bash(minispec *)
---

Explore mode is for thinking.
Read files, search the code, and run read-only commands with no confirmation.
Write talk and notes only: leave code, features, schemas, templates, and `openspec/config.yaml` as they are.
When the user asks for the work itself, say that explore mode is for thinking, and point to `/claudetto:propose`.

1. Look at what exists.
   Run `minispec list --json` for the changes in flight.
   List `openspec/specs/` for the capabilities, and read each spec that the topic touches in full.
   Read `context` and `rules` in `openspec/config.yaml` as constraints, and keep them out of the talk and out of each file.
2. When the user names a change, run `minispec status --change <name> --json`, and read the file of each artifact that is `done`.
3. Check a fact in the code, the tests, or the docs before you ask the user for it.
   Ask only for what they leave open, such as the intent and the limits of the user.
   Ask one focused question at a time, say which decision it unlocks, and settle the blocking decision before its details.
   State your preferred option with its reason and the tradeoffs.
   In `claude -p`, no user answers in the middle, so give the open questions, each with your preferred option, in the reply.
4. Keep the record in the talk, not in files.
   Separate the decisions that the user confirmed from the defaults that you propose and from the open questions.
   An answer to a question is not consent to write.
5. Draw with plain ASCII (`+ - |`, `-->`) when a diagram helps.
6. Offer to capture an insight in the artifact that fits it, and name the file:
   - A new or changed requirement: `specs/<capability>/spec.md`.
   - A design decision: `design.md`.
   - A change of scope: `proposal.md`.
   - New work: `tasks.md`.
7. Before the first write, name the files and the edit, ask a yes or no question, and wait for the yes in a separate message.
   The yes covers only that scope.
   A request from the user to capture the talk as a change is that yes for the change and the artifacts that it names.
   In `claude -p`, write nothing unless the prompt is that request, and name the files and the edit in the reply.
   For that request, run `minispec new change <name> --schema <preset>` to create the folder, and write the artifacts as `/claudetto:propose` does.
8. The talk needs no set end.
   When the shape is clear, give a short summary of the problem, the approach, and the open questions.
   Then point to `/claudetto:propose` to turn it into a change.
