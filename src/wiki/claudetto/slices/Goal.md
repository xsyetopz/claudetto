# Goal

This page tells how the `goal` slice of the core plugin `claudetto` works.
A user reads it to set a goal with `/goal`.
A contributor reads it before an edit of `slices/goal/`.

## What It Does for You

The slice replaces the built-in `/goal` with a goal engine.
A goal is a list of steps.
Each step has a title and a list of checks.
At the end of each turn, the engine runs the checks of the current step.
If a check fails, the engine starts the next turn with only the failing checks.
If all checks pass, the engine goes to the next step.
After the last step, the goal is done and the engine clears the state.

The built-in evaluator reads only the conversation, so it cannot run a check.
The engine can run a command, read a file, or ask a small model.

The state is in `.claudetto/goal.json` of the project root.
The file holds the steps, the current step, the last result of each check, the counts, the limits, and a log of the moves.
The engine reads the file at each turn, so the goal survives a compaction, a `/clear`, and a resume of the session.

## How to Use It

`/goal` answers with no model turn.
The text after `/goal` is one of these:

| Text | Effect |
| --- | --- |
| A condition | Makes a goal of one step and starts the first turn. It replaces a goal that is already set. |
| A name that ends in `.md` | Makes a goal from the steps of that plan file. |
| `status` or nothing | Shows the step, each check with its last result, and the limits. |
| `pause` | Pauses the goal. The `turn.complete` hook then runs no check. |
| `resume` | Resumes a paused goal from its current step, and starts a turn. A goal that is not paused answers `The goal is not paused.` and starts no turn. The counts of turns, the cost, and the plan percents of `--budget N%` restart. |
| `skip` | Skips the current step, and starts a turn on the next step. On the last step, it ends the goal. |
| `step N` | Moves to step N, from 1 to the count of steps, and starts a turn. This also resumes a paused goal. |
| `clear` | Clears the goal. |

The words `status`, `pause`, `resume`, `skip`, `step N`, and `clear` are commands only when they are all of the text, in lower case.
Other text, such as `resume --max-turns 5`, `Pause`, or `step x`, makes a new goal with that text.
A bad `step N`, such as `step 0`, answers with a usage line.
`pause`, `resume`, `skip`, and `step N` need a goal, and answer `No goal.` when there is none.
A move to a step clears the stall count and the last results.
The log keeps each move.

The typeahead and `/help` show the text of the goal engine for `/goal`.

## Checks

| Kind | Passes when |
| --- | --- |
| `run` | The command exits with 0. The engine runs it with `sh -c` in the project root. |
| `file` | The file exists, and it holds the `text` when the check has one. |
| `judge` | A small model answers `yes` to the claim, with the answer of the turn as facts. |

A `run` check ends after `RUN_TIMEOUT_MS` (300,000 ms) and counts as failed.
The state keeps the last `OUTPUT_TAIL_CHARS` (1,500) characters of the output, because the error is at the end.
A `judge` check that fails to answer counts as failed.

## How a Condition Becomes Checks

- If the text has only code spans in backticks, with `,`, `;`, `and`, or spaces between them, each span is a `run` check.
- If the text starts with a code span, that span is a `run` check, and the whole text is one `judge` check.
- Otherwise the whole text is one `judge` check.

## Plan Files

A heading of level 2 or 3 that starts with a number and a point is a step.
For example, `## 8b. Rewrite the page`.
Each `Check:` line below the heading, with an optional `-` and a space before it, gives the checks of that step by the rules above.
A plan file with no such heading gives an error, and so does a missing plan file.
The name of a plan file has no spaces.
A step with no `Check:` line has no checks, so it passes at the end of its first turn.

## Limits You Can Set

Flags in the text after `/goal` set the limits.
A flag takes its value after a space or after `=`.
A value must be a number above 0, and a bad value gives an error and no goal.
`--until` is the exception: a time in the past is valid, and the goal stops at the end of its first turn.
A time that is not valid, such as `25:00`, gives an error.
A limit that is left out is no limit, except `--stall`.

| Flag | Meaning | Default |
| --- | --- | --- |
| `--max-turns N` | The goal stops after N turns. | None |
| `--budget $X` or `N%` | The goal stops at a cost of X USD, or when N percent of one plan limit is used up since the start or the last `/goal resume`. The engine counts each limit (`five_hour`, `seven_day`) from its own percent at that time, a limit with no base at that time (for example a goal made before the first model reply) takes its percent at the first turn as its base, and a limit that restarts its window counts from 0. | None |
| `--until TIME` | The goal stops at `HH:MM` (the next such time), a date, or a date and time. A time that is not after now is an error. | None |
| `--stall N` | The goal stops after N turns in a row with the same failing checks and output. | 3 (`STALL_DEFAULT`) |

Digits do not count when the engine compares the output of two turns, so a changed time does not hide a stall.
The engine tests the limits in this order: `max-turns`, `budget`, `until`, and then `stall`.
The engine tests the limits only at the end of a turn, so one turn can go past a budget or `--until`.
When the last step passes, the goal ends even if a limit is reached.
At the end of a turn, the engine reads the usage of the session only for a goal with `--budget`.
A percent budget compares the highest growth of one plan limit since the start or the last `/goal resume`.
The growth counts all use of the account, not only the share that the goal spent.
A `/clear` restarts the cost of the session, and the engine counts the new cost in full.
A stop pauses the goal, writes the reason to the log, and tells Claude the reason (`max-turns`, `budget`, `until`, or `stall`) and the step.
The user can fix the cause and run `/goal resume`.

## Built-In Parts That Are Off

- The hook denies the `ProposeGoal` tool and tells Claude that the user sets a goal with `/goal`.
- The `prompt` slice leaves out the `goal_status` attachment.

## Hooks

| Hook | Filter | What it does |
| --- | --- | --- |
| `turn.complete` | None | Runs the checks and sets the next prompt. It ignores a subagent turn, a turn that is not an answer, and a paused goal. |
| `command.run` | `/goal` | Answers the command. |
| `command.describe` | `/goal` | Gives the text of the engine. |
| `tool.call` | `ProposeGoal` | Denies the tool. |

A failure of the `command.run` hook answers `Goal: <message>`, so the built-in `/goal` never runs.

## Cost

A `run` or a `file` check costs no model request.
Each `judge` check costs one small-model call at each turn end.
A goal from a plan file or from commands in backticks has no `judge` check unless the text has prose.
A retry turn names only the failing checks, with the tail of their output, so the prompt stays small.

## See Also

- [Spec](Spec)
- [Handoff](Handoff)
- [Controls](Controls)
- [Bounds](Bounds)
