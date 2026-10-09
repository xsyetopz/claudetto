# usage-awareness Specification

## Purpose

Tells the main session when its context or its account usage nears a hard stop, so that the session hands off before the stop and not after it.
Compaction is off, and Claude Code 2.1.295 ends a turn with no last model turn at the context block and at a usage limit (design D32).
Each note costs tokens one time only, and a session below the first level gets no added tokens.

## Requirements

### Requirement: Usage sources

The context share SHALL come from the usage of the last request in the transcript.
The 5-hour and 7-day shares, reset times, and run-out times SHALL come from the state file that the status line writes.
The path and the read of that file SHALL be in `lib/`, because the context feature cannot import the status line feature.
When the state file is missing, or its last sample is older than its window, the hooks SHALL give no usage note.

#### Scenario: No status line

- **WHEN** the session runs with no state file, such as in `-p` mode
- **THEN** the hooks give the context notes only and no usage note

### Requirement: One note at each level

A `UserPromptSubmit` hook and a main-session `PostToolUse` hook SHALL give `additionalContext` only when a share first reaches a level in the session.
The `PostToolUse` hook is necessary because one long turn can pass a level with no new prompt.
A marker file for each session SHALL record the levels that fired, and no level SHALL fire two times in a session.
Below the first level, the hooks SHALL add nothing.
The handoff steps SHALL be in the note text only, and not in the output style, so that a session that reaches no level does not pay for them.
The notice and the handoff note SHALL both carry the steps.

#### Scenario: Level passed in a turn

- **WHEN** a tool result takes the context from 58% to 62% in one turn
- **THEN** the next `PostToolUse` output gives the notice one time, and the next prompt gets no second notice

#### Scenario: Below the levels

- **WHEN** the context is at 40% and the 5-hour share is at 50%
- **THEN** no hook output has `additionalContext`

### Requirement: Levels

The levels SHALL be in `features/context/limits.mjs`:
`CONTEXT_NOTICE_AT` (60% of `CONTEXT_WINDOW`), `CONTEXT_HANDOFF_AT` (80%), `RATE_NOTICE_AT` (75% of the 5-hour or 7-day window), `RATE_HANDOFF_AT` (90%), and `RATE_HANDOFF_MINUTES` (15).
`CONTEXT_HANDOFF_AT` SHALL be below the client warning at `CONTEXT_WINDOW` minus 40K tokens, so that a handoff of 20K tokens ends before the client block.
The notice SHALL give the tokens left before the client block (`CONTEXT_WINDOW` minus `CONTEXT_BLOCK_MARGIN`) and the free tokens for work (that number minus `HANDOFF_RESERVE`), tell the model to start a slice only when it fits in the free tokens that are left, else to stop and do the steps, and say that the handoff note comes at `CONTEXT_HANDOFF_AT` with the steps.
The reason is that one large tool result can go from below `CONTEXT_HANDOFF_AT` directly to the client block (eval run 2026-10-09T00-12-55-297Z).
The notice SHALL also give the handoff steps for a stop before the handoff note, without the step that ends the turn, because a model that stops at the notice otherwise leaves no status note (eval run 2026-10-09).
The usage notice SHALL also give the reset time and tell the model to use smaller slices.
The usage handoff SHALL fire at `RATE_HANDOFF_AT`, or earlier when the projected run-out is within `RATE_HANDOFF_MINUTES`.

#### Scenario: Fast burn

- **WHEN** the 5-hour share is 82% and the projected run-out is in 12 minutes
- **THEN** the hook gives the usage handoff note

#### Scenario: Pin

- **WHEN** a level changes in `features/context/limits.mjs` and a copy in a test or the wiki does not
- **THEN** the pin test fails and names the copy

### Requirement: Handoff steps

The handoff note SHALL tell the model to do these steps and then end the turn:
finish the current edit and start no new one, leave no file half-edited, tick each task whose check passed, append a `Status <date>:` note to the open task in `tasks.md` with the running or failing checks, the background task IDs, the partial work, and the next step, and put the decisions of the chat in the design.
The last message SHALL name the resume command, such as `/opsx:apply <change>`.
After a context handoff, the last message SHALL tell the user to run `/clear`.
After a usage handoff, the last message SHALL give the reset time, and SHALL tell the user to continue in the same session after the reset, or to run `/clear` first when the context is at or above `CONTEXT_NOTICE_AT`.

#### Scenario: Context handoff

- **WHEN** the eval session with an OpenSpec change reaches `CONTEXT_HANDOFF_AT`
- **THEN** each task whose check passed is ticked, the open task has a status note, and the last message names `/clear` and `/opsx:apply <change>`

### Requirement: Handoff across clear

A `SessionEnd` hook with reason `clear` SHALL save the last assistant message of the session when it is a handoff, under `${CLAUDE_PLUGIN_DATA}` and keyed by the project folder.
A `SessionStart` hook with source `clear` SHALL give the saved message one time as `additionalContext` and then delete it.
The hooks SHALL write no file in the project.

#### Scenario: Project with no OpenSpec

- **WHEN** a session hands off, and the user runs `/clear`
- **THEN** the first context of the new session has the handoff message, and a second `/clear` gives it no more

### Requirement: Record of a hard stop

A `StopFailure` command hook with the matcher `rate_limit|invalid_request` SHALL write a stop record with the time, the error, the reset time when known, and the last assistant message, cut to `STOP_RECORD_MAX_CHARS`.
The next `SessionStart` SHALL give one line that names the stop and tells the model to check the tree for partial edits.
The hook SHALL NOT expect a model turn, because Claude Code ignores the output of `StopFailure`.

#### Scenario: Usage limit hit

- **WHEN** a turn ends with `You've hit your session limit`
- **THEN** the stop record exists, and the next session start names the stop in one line
