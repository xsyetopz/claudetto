# Spec Delta: `output-gc`

## Purpose

Records each file and folder that Claude and its agents make outside the project, and removes each one that nothing uses, so that the outputs of Claude do not fill the disk.

## ADDED Requirements

### Requirement: Record of outputs

`claudetto` SHALL record each output that a session makes: `mktemp` folders, worktrees, repository copies, sandbox config folders, scratch files, and task output.
Each record SHALL hold the path, the session, the time, and the size when known.

#### Scenario: A temp folder

- **WHEN** Claude runs `mktemp -d` in a `Bash` call
- **THEN** the record holds the new path and the session id

### Requirement: Roots are kept

The sweep SHALL keep each output that a live session, a running job, or a worktree in use still needs.

#### Scenario: A running job

- **WHEN** a background job of a live session uses a recorded folder
- **THEN** the sweep does not remove that folder

### Requirement: Only recorded outputs

The sweep SHALL remove only a path that is in the record and inside an allowed temp root or the worktree folder.
It SHALL NOT remove a path that the user made, and SHALL NOT follow a symlink out of the root.

#### Scenario: A path outside the roots

- **WHEN** a record names a path outside each allowed root
- **THEN** the sweep does not remove it and reports it

### Requirement: Sweep by age and size

The sweep SHALL remove the unused outputs that are older than an age bound, and then the oldest ones until the total is under a size bound.

#### Scenario: Over the size bound

- **WHEN** the unused outputs are over the size bound
- **THEN** the sweep removes the oldest until the total is under the bound

### Requirement: When the sweep runs

The sweep SHALL run at session start, at session end, and with a command.
The command SHALL have a dry-run option that lists each path and its size and removes nothing.

#### Scenario: Dry run

- **WHEN** the user runs the sweep command with the dry-run option
- **THEN** it lists the paths and the total size, and no path is removed

### Requirement: Report

Each sweep SHALL report the count of removed paths and the space it freed.

#### Scenario: Sweep at session end

- **WHEN** a session ends and the sweep removes 3 folders
- **THEN** the log names the 3 paths and the freed size
