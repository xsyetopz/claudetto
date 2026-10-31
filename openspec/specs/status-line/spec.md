# status-line Specification

## Purpose
A status line and a subagent status line that read only the stdin JSON of Claude Code `2.1.314`.

## Requirements

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

### Requirement: `/statusline` Is Answered Without a Model Call

The built-in `/statusline` with no arguments SHALL write claudetto's `statusLine` and `subagentStatusLine` to the user settings file and print a report of what it wrote. It SHALL make no model call and add nothing to the context. A line the user already set SHALL be kept, and the report SHALL say it was kept.

#### Scenario: No Line Set

- **WHEN** the user runs `/statusline` and the settings file has no `statusLine`
- **THEN** both keys are written with claudetto's command, the report names the file, and no model request is sent

#### Scenario: User Line Kept

- **WHEN** the user runs `/statusline` and the settings file has a `statusLine` that is not claudetto's
- **THEN** that value is unchanged, and the report says it was kept

#### Scenario: Unreadable Settings

- **WHEN** the settings file is not a JSON object
- **THEN** nothing is written, and the report names the file to fix

### Requirement: `/statusline` With Arguments

`/statusline <text>` SHALL run the built-in command when the settings do not deny `Agent(statusline-setup)`. When they deny it, claudetto SHALL answer with no model call, saying the built-in agent is denied and naming the rule to remove.

#### Scenario: Agent Denied

- **WHEN** the user runs `/statusline show the time` and `permissions.deny` holds `Agent(statusline-setup)`
- **THEN** no model request is sent, and the answer names `Agent(statusline-setup)` in `permissions.deny`

#### Scenario: Agent Allowed

- **WHEN** the user runs `/statusline show the time` and nothing denies `Agent(statusline-setup)`
- **THEN** the built-in command runs
