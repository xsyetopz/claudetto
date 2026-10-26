## ADDED Requirements

### Requirement: Check before Stop

When a main turn edits a file that is not Markdown and runs no passed check after its last such edit, the stop hook SHALL block the stop one time, with a reason that names the checks of the project.
The checks of a project SHALL be its `justfile` recipes that `isCheck` accepts, and `bun test` when it has a `bun.lock`.
A project with no such check, and a stop that a hook blocked before, SHALL get no block.

#### Scenario: Edit with No Check

- **WHEN** a turn edits a `.ts` file and runs no check after it, in a project with a `just check` recipe
- **THEN** the stop is blocked, and the reason names `just check`

#### Scenario: Edit with a Passed Check

- **WHEN** a passing `just check` runs after the last edit
- **THEN** the stop goes on

#### Scenario: Markdown Only

- **WHEN** a turn edits only `.md` files
- **THEN** the stop goes on

#### Scenario: Second Stop

- **WHEN** the stop event has `stop_hook_active: true`
- **THEN** the stop goes on

## MODIFIED Requirements

### Requirement: Stop Passes

The `stop` hook SHALL let each stop pass, except for the goal check of "Goal Check in Stop", the open task after a tick, and "Check before Stop".

#### Scenario: Deferred Reply

- **WHEN** a reply defers work
- **THEN** the stop passes, and the note shows above the prompt
