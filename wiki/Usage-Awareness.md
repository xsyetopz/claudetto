# Usage awareness

Compaction is off in the dotclaude profile.
Claude Code 2.1.295 ends a turn with no last model turn at the context block and at a usage limit.
This page says how dotclaude tells the main session to hand off before that stop.
The decision is D32 in the OpenSpec change `dotclaude-0-28-0` (`design-parts-2.md`).
The subagent bound is on the page [Context bound](Context-Bound).

## Evidence from the bundle

Source: the strings of the 2.1.295 bundle, read 2026-10-09.

- A usage limit is a 429 that ends the turn with `You've hit your session limit · resets <time>`, or `weekly limit` for the 7-day window (**confirmed**).
  The client does not retry it for a subscription (**inferred**), so the model gets no last turn.
- The usage warning goes to the user only, from the server header `anthropic-ratelimit-unified-*-surpassed-threshold` at 70% or more (**confirmed**).
  No hook input and no mod event has `rate_limits`, and only the status line input has them (**confirmed**).
- With compaction off, the window is `W = CONTEXT_WINDOW - min(max output, 20K)`.
  The client warns at `W - 20K` (260K) and blocks before the request at `W - 3K` (277K) with `Prompt is too long` (**confirmed**).
- `StopFailure` fires in place of `Stop` when an API error ends the turn, with `error` and `last_assistant_message`.
  Claude Code ignores its output (**confirmed**).
  A 429 maps to `rate_limit`, and the context block maps to `invalid_request` (**inferred**).

## Levels

All levels are in `plugins/dotclaude/features/context/limits.mjs`.
`RATE_NOTICE_AT` and `RATE_HANDOFF_AT` are `USAGE_LEVELS` of `lib/budget.mjs`, so the status line marks the same shares.
A test pins each copy in this table.

| Level | Value | Use |
| --- | --- | --- |
| `CONTEXT_NOTICE_AT` | 60 percent | The notice: the tokens left before the client block, the free tokens for work, start a slice only when it fits in them, and do the handoff steps on a stop. |
| `CONTEXT_HANDOFF_AT` | 80 percent | The handoff note, then `/clear`. |
| `CONTEXT_BLOCK_MARGIN` | 23,000 tokens | The client block is at `CONTEXT_WINDOW` minus this margin (277K). |
| `HANDOFF_RESERVE` | 20,000 tokens | The notice keeps these tokens free below the client block for the handoff steps. |
| `RATE_NOTICE_AT` | 75 percent | The usage notice of the 5-hour or 7-day window: the reset time, and smaller slices. |
| `RATE_HANDOFF_AT` | 90 percent | The usage handoff note, with the reset time. |
| `RATE_HANDOFF_MINUTES` | 15 minutes | The usage handoff fires earlier when the projected run-out is this near. |
| `NOTE_MAX_BYTES` | 2,000 bytes | The most bytes of one note. |
| `STOP_RECORD_MAX_CHARS` | 4,000 characters | The most characters of the last message in a stop record or a handoff across `/clear`. |

80% of the window of 300K is 240K.
That leaves room for a handoff of 20K tokens below the warning at 260K.
The user, Claude, and Jev chose the levels on 2026-10-09 (Jev confidence 0.35, a weak signal).

## Layer 1: the handoff before the stop

- The hook `features/context/cli.mjs` runs on `UserPromptSubmit` and on `PostToolUse` in the main session.
  The `PostToolUse` route is necessary, because one long turn can pass a level with no new prompt.
- The context share comes from the usage of the last request in the transcript.
- The 5-hour and 7-day shares, the reset times, and the run-out times come from a file that the status line writes (`lib/usage-state.mjs`).
  With no file, such as in `-p` mode, the hook gives the context notes only.
- The hook makes one marker file for each level of a session with the `wx` flag, so each level fires one time, also when two hooks run at the same time.
  When the hook cannot make the marker, it gives no note, so no note repeats at each call.
  A new usage window fires its levels again.
  Below the first level, the hook adds nothing.
- The handoff steps are in the note and not in the output style, so a session that reaches no level does not pay for them.
  The note tells the model to finish the current edit, mark each task whose check passed, add a `Status <date>:` note to the open task, put the decisions in `design.md`, and name the resume command, such as `/opsx:apply <change>`.
- After a context handoff, the last message tells the user to run `/clear`.
  After a usage handoff, it gives the reset time.
  It tells the user to continue in the same session after the reset, or to run `/clear` first when the context is at or above `CONTEXT_NOTICE_AT`.

## Layer 2: the record at the stop

`features/context/cli.mjs` also runs on `StopFailure`, `SessionStart`, and `SessionEnd`, and `features/context/carry.mjs` holds the logic.
Each file is in `${CLAUDE_PLUGIN_DATA}` and has a hash of the project folder in its name, because `SessionStart` with source `clear` has no field for the old session.
No hook writes a file in the project.

- A `StopFailure` command hook with the matcher `rate_limit|invalid_request` writes a stop record: the time, the error, the reset time from the message, and the last message.
  A usage limit is `rate_limit`, and a full context ("Prompt is too long") is `invalid_request`.
- The next `SessionStart` names the stop in one line and tells the model to examine the working tree for incomplete edits.
  Then the record moves to `last-stop-<hash>.json`, so the line comes one time.
- `SessionEnd` with reason `clear` saves the last assistant message when a handoff note fired in the session.
  `SessionStart` with source `clear` gives it one time, inside a `handoff` tag, and removes it.
- `STOP_RECORD_MAX_CHARS` cuts the saved message.
- In `-p`, Claude Code stops about 10 ms after the API error and stops the `StopFailure` hook before it writes, so a stop in `-p` has no record.
  The status line does not run in `-p` either, so `-p` gets no usage note.

Evidence: the probes of task 22.1 and the live runs of task 22.5 on Claude Code 2.1.295 (2026-10-09), in `research/probes-4.md` of the change.

## Rejected and deferred

- Rejected: a figure at each turn, because it costs tokens at each turn.
- Rejected: the handoff text in the output style, because it costs tokens in each request.
- Rejected: a separate `handoff.md`, because `/opsx:apply` reads `tasks.md`, and the repository already keeps `Status <date>:` notes there.
- Deferred: the router step-down under usage pressure (task 20.3).
