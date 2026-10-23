## Purpose

claudetto cuts the tokens and the turns that a long session spends on repeated work, with code and no model call.

## ADDED Requirements

### Requirement: One Monitor per Command

When Claude starts `Monitor` with the same command as a running `Monitor` of the session, the system SHALL answer with a short result that names the running task, and SHALL NOT start a second one.

#### Scenario: Duplicate Monitor

- **WHEN** a `Monitor` runs `tail -f /tmp/a.log`, and Claude starts `Monitor` with `tail -f /tmp/a.log`
- **THEN** no second task starts, and the result names the first task

### Requirement: Repeat Read

When Claude reads a file that the session read before, and the hash of the file did not change, the system SHALL answer with a short result that says that the file did not change, unless the probe of task 10.6 shows that Claude Code already does so.

#### Scenario: Unchanged File

- **WHEN** Claude reads `a.ts` twice with no change between the reads
- **THEN** the second result is a short line, not the file text

### Requirement: Goal Stop Cap

The `/goal` stop SHALL block a stop at most a bound number of times in a row, from `slices/goal/limits.ts`, and then let the stop go with a note to the user.

#### Scenario: Stuck Goal

- **WHEN** the stop check fails more times in a row than the bound
- **THEN** the session stops, and the note names the goal and the count
