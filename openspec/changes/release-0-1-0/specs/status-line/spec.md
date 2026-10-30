## Purpose

A status line and a subagent status line that read only the stdin JSON of Claude Code `2.1.314`.

## ADDED Requirements

### Requirement: Stdin Only

The status line command SHALL build its output from its stdin JSON alone: no file read, no network, no model call, no child process.

#### Scenario: Normal Input

- **WHEN** the command gets a `2.1.314` status line JSON on stdin
- **THEN** it prints one line and exits 0, and a test shows no file, network, or process call

### Requirement: Fixed Defects of the Old Line

The rebuilt line SHALL NOT show defects D1 to D4 and D7 of `/tmp/ccx/report-statusline.md`. Each has a test with the input that showed it.

#### Scenario: Old Defect Input

- **WHEN** the command gets the input of one listed defect
- **THEN** its output is the fixed one

### Requirement: Bad Input Does Not Break the Line

A missing field or input that is not JSON SHALL print a short line and exit 0, never a stack trace.

#### Scenario: Missing Field

- **WHEN** a field the line uses is absent
- **THEN** that part is left out and the rest prints

### Requirement: Setup Writes Both Lines

Setup SHALL write `statusLine` and `subagentStatusLine` as commands at the plugin root, and keep a value the user set.

#### Scenario: User Line Kept

- **WHEN** `statusLine` is already set to another command
- **THEN** setup keeps it and the report says so
