## Purpose

The compaction that code builds in place of the model summary of Claude Code, its format, its fallback, and the probe that picks the default path.

## ADDED Requirements

### Requirement: Code Compaction

On the code path, the `session.compact` hook SHALL answer each trigger (`manual`, `auto`, and `plugin`) with messages that code builds, and SHALL make no model request.
The messages SHALL be one handoff message, then the newest messages of the session kept by `handle`, up to the tail budget.

#### Scenario: Automatic Compaction

- **WHEN** the context reaches the compact threshold and the engine calls `session.compact` with `trigger` `auto`
- **THEN** the hook returns `messages` with the handoff message first, and the result has no `usage`

#### Scenario: Tool Pair Kept

- **WHEN** the tail budget ends between a `tool_use` and its `tool_result`
- **THEN** the tail keeps both or neither

### Requirement: Fallback to Built-in Compaction

When the build fails, or the handoff message is over the head budget, the hook SHALL call `next(e)` and SHALL log the cause.

#### Scenario: Build Error

- **WHEN** reading the transcript throws
- **THEN** the built-in compaction runs, and the log names the error

### Requirement: Handoff Format

The handoff message and the handoff file SHALL have the sections `## Goal`, `## Constraints and Pins`, `## Decisions`, `## Open Change and Tasks`, `## Files`, `## Errors and Fixes`, `## Checks`, `## Next Step`, and `## User Messages`, in this order.
`## Constraints and Pins` SHALL quote each rule of the user word for word, with its source.

#### Scenario: Pinned Version

- **WHEN** the user wrote "pin `zod` to `3.23`" early in the session
- **THEN** `## Constraints and Pins` holds that line word for word

### Requirement: Only Words of the User

`## User Messages` and `## Constraints and Pins` SHALL hold only text that the user typed, and no `<task-notification>`, `<system-reminder>`, hook text, or row with `isMeta`.

#### Scenario: Task Notification

- **WHEN** the last user row is a `<task-notification>` of a subagent
- **THEN** no section quotes it as words of the user

### Requirement: One State of Each Task

The handoff SHALL name each task of the open change in exactly one state: done, open, or next.

#### Scenario: Next Task Open

- **WHEN** task `1.1` is the next open task
- **THEN** the handoff names `1.1` as next, and no line says that no task is open

### Requirement: Default Path from the Probe

The probe SHALL measure the built-in compaction and the `/clear` handover against the code compaction of `0.4.0-alpha.1`.
The code path SHALL become the default only when it matches or beats the built-in compaction on quality, costs less, and has no cache problem (the user, 2026-10-26).
Until then, the probe SHALL declare no winner, and the default SHALL stay.

#### Scenario: Code Arm Meets Each Bar

- **WHEN** the code arm keeps each planted constraint at least as often as the built-in arm, costs less, and has no cache problem
- **THEN** the code path is the default, and the evidence page holds the numbers of each arm and each round

#### Scenario: Code Arm Cheaper but Worse

- **WHEN** the code arm costs less but breaks a planted constraint more often than the built-in arm
- **THEN** no winner is declared, the default stays, and the next round changes the code path

### Requirement: No Cache Problem

The probe SHALL count a cache problem for the code arm when its cache write after the compaction step is larger than the one of the built-in arm, or when a follow-up turn has a lower cache read share than the same turn of the built-in arm.

#### Scenario: Larger Cache Write

- **WHEN** the first request after the code compaction writes more cache tokens than the first request after the built-in compaction
- **THEN** the probe counts a cache problem, and the code arm does not meet the bar
