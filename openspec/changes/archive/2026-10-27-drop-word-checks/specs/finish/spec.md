## REMOVED Requirements

### Requirement: Note on Deferred Work

**Reason**: The note matched a list of English labels and phrases of left work, and the user asked for each word-based check to be removed (the user, 2026-10-27).
**Migration**: None. The reply style of the main agent asks it to finish the work or to name the block.

### Requirement: Note on Unproven Done

**Reason**: The note showed only when the reply said "ready" or "done", which is a word match.
**Migration**: "Note on Unproven Box" keeps the box part with no word gate.

### Requirement: Fixtures Hold the Rules

**Reason**: The fixtures tested the rules of deferred replies, which are removed.
**Migration**: None.

### Requirement: Stop Passes

**Reason**: Its scenario was a deferred reply, which no rule reads now.
**Migration**: "Notes Leave the Stop Open" holds the same rule with a scenario of an unproven box.

## ADDED Requirements

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
