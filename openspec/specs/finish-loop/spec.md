# finish-loop Specification

## Purpose
Drive a task to done: a goal command that must pass, and the open boxes of `tasks.md`.

## Requirements

### Requirement: Goal Command

`/goal <cmd>` SHALL record the command, and the Stop hook SHALL block a stop while the command fails, with its last output lines as the reason.

#### Scenario: Failing Goal

- **WHEN** the model stops and the goal command exits non-zero
- **THEN** the stop is blocked with the failing lines

#### Scenario: Passing Goal

- **WHEN** the goal command exits 0
- **THEN** the stop goes through and the goal is cleared

### Requirement: Root Agent Stops a Goal

The root agent SHALL be able to pause or block the goal with a reason, and a stopped goal SHALL run no check at a stop until `/goal resume`.

#### Scenario: Blocked Goal

- **WHEN** the root agent calls the goal tool with status `blocked` and a reason
- **THEN** the next stop goes through with no check, and `/goal` shows the reason

#### Scenario: Resumed Goal

- **WHEN** the user runs `/goal resume` on a paused or blocked goal
- **THEN** the next failing stop is blocked again

### Requirement: `tasks.md` Loop

When an OpenSpec change is being applied, the Stop hook SHALL block a stop while its `tasks.md` holds an open box, and name the next one.

#### Scenario: Open Task

- **WHEN** `tasks.md` holds `- [ ] 2.3`
- **THEN** the stop is blocked naming `2.3`

#### Scenario: Blocked Task

- **WHEN** the open box of `2.3` holds `blocked: <reason>` and `2.4` is open
- **THEN** the stop is blocked naming `2.4`, and a file of only blocked boxes lets the stop through

### Requirement: Bounded Loop

The loop SHALL stop blocking after a fixed number of blocks in a row with no change, so it cannot spin.

#### Scenario: No Progress

- **WHEN** the same block repeats the fixed number of times with no file change
- **THEN** the stop goes through with a note, and a goal is marked `blocked`
