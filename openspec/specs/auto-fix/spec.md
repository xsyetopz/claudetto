# auto-fix Specification

## Purpose

Lets the project's own formatters and linters fix the files that Claude edits, so that Claude spends context only on the issues that the tools cannot fix.

## Requirements

### Requirement: Fix at stop

The auto-fix hook SHALL record the path of each file that Claude edits, and fix the recorded files when Claude stops.
It SHALL NOT change a file between two edits of Claude in the same turn.

#### Scenario: Two edits

- **WHEN** Claude edits the same file two times in one turn
- **THEN** the second edit does not fail because a tool changed the file

### Requirement: Project tools only

The hook SHALL run a tool only when the project has its config file or its local binary.
It SHALL prefer a binary in the project, such as `node_modules/.bin` or `.venv/bin`, to a binary on `PATH`.
It SHALL NOT install a tool, and it SHALL NOT run a `package.json` script.

#### Scenario: No config

- **WHEN** the project has no config for any known tool
- **THEN** the hook runs no tool and adds no text

#### Scenario: Local binary

- **WHEN** the project has `biome.json` and `node_modules/.bin/biome`
- **THEN** the hook runs that binary on the edited files

### Requirement: Edited files only

The hook SHALL fix only files that Claude edited in the turn and that are in the project folder.
It SHALL skip generated and vendored folders such as `node_modules`.

#### Scenario: File outside the project

- **WHEN** Claude edited a file outside the project folder
- **THEN** the hook does not run a tool on it

### Requirement: Report only what remains

When the tools fix all issues, the hook SHALL add no text.
When issues remain, the hook SHALL block the stop one time with a list of `file:line rule` for each remaining issue, at most 20 lines.

#### Scenario: All fixed

- **WHEN** the tools fix all issues
- **THEN** Claude stops and gets no text from the hook

#### Scenario: Issues remain

- **WHEN** a lint rule has no automatic fix
- **THEN** Claude gets the list and continues the turn

### Requirement: Block once

The hook SHALL block a stop at most one time in a turn.

#### Scenario: Second stop

- **WHEN** Claude stops again after the hook blocked the first stop
- **THEN** the hook does not block

### Requirement: Fail quiet

When a tool is missing, fails to start, or passes its time limit, the hook SHALL add no text and SHALL let Claude stop.

#### Scenario: Time limit

- **WHEN** a linter runs past the time limit
- **THEN** the hook stops it and lets Claude stop
