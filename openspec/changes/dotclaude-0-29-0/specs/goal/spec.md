## ADDED Requirements

### Requirement: Goal from open tasks

The goal entry SHALL set a goal whose stop condition is that the selected open tasks of the active OpenSpec change are checked (design D20).
The user SHALL be able to name the change, a task range, and a turn cap.

#### Scenario: Default goal

- **WHEN** the user runs the goal entry with no argument in a project with one active change
- **THEN** the goal covers all open tasks of that change

#### Scenario: Task range

- **WHEN** the user runs the goal entry with the range `2.1-2.4`
- **THEN** the goal covers only those tasks

### Requirement: Stop on the condition

The session SHALL keep working while a selected task is open, and SHALL stop when all selected tasks are checked or the turn cap is reached.

#### Scenario: Tasks done

- **WHEN** the last selected task is checked in `tasks.md`
- **THEN** the goal ends and the session stops

#### Scenario: Turn cap

- **WHEN** the turn cap is reached with open tasks
- **THEN** the session stops and names the open tasks

### Requirement: No active change

The goal entry SHALL set no goal when the project has no active change, and SHALL say why.

#### Scenario: No change

- **WHEN** the user runs the goal entry in a project with no active change
- **THEN** no goal is set, and the reply says that no active change exists
