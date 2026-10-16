# Spec Delta: `check-runner`

## Purpose

Runs a batch of check commands in one tool call and gives one short result, so that the checks take no model turns between them.

## ADDED Requirements

### Requirement: One call, one result

The runner SHALL run each check of the batch and give, for each check, the command, the exit code, and the tail of a failed output.

#### Scenario: One check fails

- **WHEN** a batch of 3 checks runs and the second fails
- **THEN** the result names the second check, its exit code, and the tail of its output, and the third check still runs

### Requirement: The exit code decides, not the words of the output

The runner SHALL decide pass or fail from the exit code only.
For a failed check, the runner SHALL show the last lines of the output, up to a fixed bound, and SHALL NOT choose lines or give counts from the words of the output.

#### Scenario: A passing test that logs an error

- **WHEN** a check exits with code 0 and its output has the word `error`
- **THEN** the check passes

#### Scenario: A failed check in another language

- **WHEN** a check fails and its output is in Polish or Japanese
- **THEN** the result shows the last lines of the output, the same as for English output

### Requirement: The guard applies to each check

Each command of a batch SHALL pass the same guard and asks as a `Bash` call.

#### Scenario: A denied command in a batch

- **WHEN** a batch holds a command that the guard denies
- **THEN** the runner does not run that command, and the result gives the reason

### Requirement: A pipe does not hide a failure

A check with a pipe SHALL fail when any part of the pipe fails.

#### Scenario: A failed test into `tail`

- **WHEN** a check is `bun test | tail -5` and `bun test` fails
- **THEN** the check fails

### Requirement: A timeout stops the whole check

When a check passes its time bound, the runner SHALL stop the check and each child process of it.

#### Scenario: A hung check

- **WHEN** a check passes its time bound
- **THEN** no process of the check runs after the result
