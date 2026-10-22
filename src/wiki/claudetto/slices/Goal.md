# Goal

This page tells how the `goal` slice of the core plugin `claudetto` works.
A user reads it to set a goal with `/goal`.
A contributor reads it before an edit of `slices/goal/`.

## What It Does for You

A goal is one check command.
The `Stop` hook runs the check each time Claude tries to stop.
If the check exits `0`, the stop goes on and the goal is cleared.
If the check fails, the stop is blocked, and Claude gets the tail of the output.
The hook makes no model call.

The state is in `.claudetto/goal.json` of the project root.
The file holds the check command.
The hook reads the file at each stop, so the goal survives a compaction, a `/clear`, and a resume of the session.

## How to Use It

`/goal` answers with no model turn.
A plugin skill cannot replace the built-in `/goal`, because the plugin name is its prefix.
So a `command.run` hook answers in its place.

| Text | Effect |
| --- | --- |
| A command | Sets the check, and starts a turn. It replaces a goal that is already set. |
| `status` or nothing | Shows the check. |
| `clear` | Clears the goal. |

A pair of backticks around the command is cut.

## Check

The hook runs the command with `sh -c` in the project root.
A check ends after `RUN_TIMEOUT_MS` (300,000 ms) and counts as failed.
The hook keeps the last `OUTPUT_TAIL_CHARS` (1,500) characters of the output, because the error is at the end.

## Built-In Parts That Are Off

- The `setup` snippet sets `modelProposedGoals` to `disabled`, so the model proposes no goal.
- The `prompt` slice leaves out the `goal_status` attachment.

## Hooks

| Hook | Filter | What it does |
| --- | --- | --- |
| `classic.Stop` | None | Runs the check and blocks the stop until it exits `0`. |
| `command.run` | `/goal` | Answers the command. |

A failure of the `command.run` hook answers `Goal: <message>`, so the built-in `/goal` never runs.

## Related Pages

- [Spec](Spec)
- [Handoff](Handoff)
- [Controls](Controls)
- [Bounds](Bounds)
