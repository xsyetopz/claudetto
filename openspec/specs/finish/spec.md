# Finish Specification

## Purpose
claudetto denies a ticked task with no check, and shows the user a note for a ticked box with no passed check or a heading in the wrong case, with two hooks, no model call, and no rule that reads English words.

## Requirements

### Requirement: Box Needs a Check

The `box` hook on `Edit` and `Write` of a `tasks.md` SHALL deny each change of a box from `- [ ]` to `- [x]` that has no passed check of that task in the session record.
The denial SHALL name the task id.

#### Scenario: Tick with No Check

- **WHEN** Claude ticks task `10.1` right after a `ground` block stopped the evidence write (row 28 of `research/incidents.md`)
- **THEN** the hook denies the edit and names `10.1`

#### Scenario: Tick with a Passed Check

- **WHEN** the session record holds a passed check of task `3.2`, and Claude ticks `3.2`
- **THEN** the edit runs

#### Scenario: Other Edit

- **WHEN** Claude edits the text of a task and leaves its box as it was
- **THEN** the hook allows the edit

### Requirement: Goal Check in Stop

The `/goal` stop check SHALL run in the `stop` hook of this slice, and SHALL follow the cap of spec `session-economy`.

#### Scenario: Goal Not Met

- **WHEN** a goal is set, the stop check fails, and the cap is not reached
- **THEN** the hook blocks the stop once for that check

### Requirement: Note on Unproven Box

The `stop` hook SHALL set a `Not proven` note when a task box that the session checked has no passed check of that task in the session record.
The note SHALL name the task.

#### Scenario: Box with No Check

- **WHEN** the session checked the box of task `3.2`, and the session record holds no passed check of `3.2`
- **THEN** the note names `3.2`

#### Scenario: Box with a Check

- **WHEN** each box that the session checked has a passed check
- **THEN** no `Not proven` note shows

### Requirement: Notes Leave the Stop Open

The `stop` hook SHALL let each stop pass, except for the goal check of "Goal Check in Stop".

#### Scenario: Unproven Box

- **WHEN** the reply ends with a box that has no passed check
- **THEN** the stop passes, and the note shows above the prompt
