# Handoff Files

This page tells what the handoff of `claudetto` holds and where it writes the file.
A user who reads a handoff file and a contributor who edits the `handoff` slice read it.
See [Handoff](Handoff) for how and when the handoff runs.

## The File

Each handoff goes to `.claude/claudetto/handoffs/handoff-<UTC time>.md`, such as `handoff-20261016T120000Z.md`.
A change folder of `openspec/changes/` gets no `handoff.md`.

The open change is the first folder of `openspec/changes/`, by name, that has an open task in its `tasks.md`.
The folder `archive` is not a change.
With an open change, the file starts with the change name, the next open task, the done tasks, the open tasks, and the passed checks.

## The Handover Handoff

A handover builds its handoff in code, with no model call.
It has these parts:

- The task: the first line of the first user message, cut at 1,500 characters.
- The changed files: the files of the last `Write`, `Edit`, `MultiEdit`, and `NotebookEdit` calls, at most 20.
- The last words of the user: the last 3 user messages, each cut at 1,500 characters, in one block quote.
- The decisions: each `AskUserQuestion` call that the user answered, with the chosen option.
- The options that the user ruled out: each option of those calls that the user did not choose.
- The values of the user: each value in backticks in a message of the user.
- The earlier handoff, when this session resumed on a handover.

## The Status Comes From Facts

The code writes the handoff with no model text, so only facts make a done step:

- The done list is the list of the checked tasks of `tasks.md` that a passed check supports.
  A task line that names check commands in backticks needs one of them to have passed.
  A line that names none needs any passed check.
  A checked box with no passed check of its task is an open task.
- A passed check is a `Bash` call of `just check`, `just test`, `just lab`, `just lint`, `just validate`, the same with `docker`, or `bun test`, with a result and no error.
  A command with `;`, `&`, a pipe, or a redirect does not count, and a background command does not count.

## Update of an Earlier Handoff

A handoff is a short note that `claudetto` writes in place of the summary of a compaction.
This page shows what the note holds and where the file is.
[Handoff](Handoff) tells when and how it runs.

## Related Pages

- [Handoff](Handoff)
- [Ground](Ground)
