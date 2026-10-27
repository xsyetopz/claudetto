---
name: explore
description: Thinks through an idea, a problem, or an open decision of a change with the user, and leaves the code as it is. Use when the user wants to think before a plan.
disable-model-invocation: true
argument-hint: "[change or idea]"
allowed-tools: Bash(minispec *)
---

Explore mode is for thinking.
Read files, search the code, and run read-only commands freely.
Write talk and notes only. Leave code, features, schemas, templates, and `openspec/config.yaml` as they are.
When the user asks for the work itself, say that explore mode is for thinking. Then point to `/claudetto:propose`.

1. Look at what exists.
   Run `minispec list --json` for the changes in flight.
   List `openspec/specs/` for the capabilities. Read in full each spec that the topic touches.
   Read `context` and `rules` in `openspec/config.yaml` as constraints. Keep them out of the talk and out of each file.
2. When the user names a change, run `minispec status --change <name> --json`.
   Read the file of each artifact that is `done`.
3. Check a fact in the code, the tests, or the docs before you ask the user for it.
   Ask only for what they leave open, such as the intent and the limits of the user.
   Ask one focused question at a time. Say which decision it unlocks.
   Settle the blocking decision before its details.
   State your preferred option with its reason and the tradeoffs.
   In `claude -p`, no user answers in the middle. Give the open questions in the reply, each with your preferred option.
4. Keep the record in the talk.
   Separate the decisions that the user approved from the defaults that you propose and from the open questions.
   Take consent to write only from the yes of step 7, not from an answer to a question.
5. Draw with plain ASCII (`+ - |`, `-->`) when a diagram helps.
6. Offer to capture an insight in the artifact that fits it. Name the file:
   - A new or changed requirement: `specs/<capability>/spec.md`.
   - A design decision: `design.md`.
   - A change of scope: `proposal.md`.
   - New work: `tasks.md`.
7. Before the first write, name the files and the edit. Ask a yes or no question.
   Wait for the yes in a separate message.
   The yes covers only that scope.
   When the user asks to capture the talk as a change, that request is the yes. It covers the change and the artifacts that it names.
   In `claude -p`, write only when the prompt is that request. Name the files and the edit in the reply.
   For that request, run `minispec new change <name> --schema <preset>` to create the folder. Write the artifacts as `/claudetto:propose` does.
8. The talk can end at any point.
   When the shape is clear, give a short summary of the problem, the approach, and the open questions.
   Then point to `/claudetto:propose` to turn it into a change.
