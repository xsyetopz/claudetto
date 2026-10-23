## Purpose

claudetto denies a ticked task with no check, and shows the user a note when a reply calls work done with no proof or hands back work that it can finish, with two hooks and no model call.

## ADDED Requirements

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

### Requirement: Note on Deferred Work

The `stop` hook SHALL set a `notes` note when the last reply lists work as not done, not fixed, paused, or for later, and names no block that stopped it (`AskUserQuestion` answer, 2026-10-23: "Note only").
The note SHALL name the deferred item.

#### Scenario: Check Left as Not Done

- **WHEN** the reply says "Not done: the side check ... I deleted its temp folder without rerunning it" (row 6)
- **THEN** the note names the side check

#### Scenario: Follow-Up List

- **WHEN** the reply says "Follow-ups ... needs no change" (row 2)
- **THEN** the note names the follow-ups

#### Scenario: Named Block

- **WHEN** the reply says that a sandbox deny stopped a check, and gives the `!` command
- **THEN** no note shows

### Requirement: Note on Unproven Done

The `stop` hook SHALL set a note when the last reply says "ready" or "done" and `git status` shows an uncommitted change of the session, or a task box has no passed check.

#### Scenario: Ready with Uncommitted Slices

- **WHEN** the reply says "`0.3.0-alpha.1` is ready to publish" and the slices are uncommitted (row 27)
- **THEN** the note names the uncommitted files

#### Scenario: Ready and Committed

- **WHEN** the reply says "done", the tree has no change of the session, and each box has a check
- **THEN** no note shows

### Requirement: Stop Passes

The `stop` hook SHALL let each stop pass, except for the goal check of "Goal Check in Stop".

#### Scenario: Deferred Reply

- **WHEN** a reply defers work
- **THEN** the stop passes, and the note shows above the prompt

### Requirement: Fixtures Hold the Rules

The rules SHALL match on the shape of a reply, with no model call.
A test SHALL run each known-bad reply of `research/incidents.md` and expect one note, and each known-good reply and expect no note.

#### Scenario: Known-Bad Reply

- **WHEN** the test runs the fixture of row 1 of `research/incidents.md`
- **THEN** the hook sets a note

#### Scenario: Known-Good Reply

- **WHEN** the test runs a fixture that names a sandbox deny with the exact command
- **THEN** the hook sets no note

### Requirement: Goal Check in Stop

The `/goal` stop check SHALL run in the `stop` hook of this slice, and SHALL follow the cap of spec `session-economy`.

#### Scenario: Goal Not Met

- **WHEN** a goal is set, the stop check fails, and the cap is not reached
- **THEN** the hook blocks the stop once for that check
