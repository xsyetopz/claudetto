# Spec Delta: `safety-asks`

## Purpose

Asks the user before a tool call that discards work, weakens a test, adds a lint suppression, or changes a protected file, because a hook gate holds where a prompt rule fails.

## ADDED Requirements

### Requirement: Ask before a call that discards work

A `Bash` call that discards uncommitted work or history SHALL get an ask, with the reason in the ask.

#### Scenario: `git reset --hard`

- **WHEN** Claude runs `git reset --hard` in a tree with uncommitted changes
- **THEN** the user gets an ask that says which work the command discards

### Requirement: Ask before a test is weakened

An edit that skips a test, removes an assertion, or adds a lint suppression SHALL get an ask.
The check SHALL apply to a test file of any size.

#### Scenario: A large test file

- **WHEN** Claude adds `.skip` to a test in a test file larger than the read bound
- **THEN** the user gets an ask

### Requirement: Ask before a check is changed

An edit of a script of `package.json`, or of a recipe of a `justfile` or `Makefile`, that is a check SHALL get an ask.
A script or a recipe is a check when it runs a known check program or another check, or has a documented entry name (`test`, `check`).
The decision SHALL NOT depend on the words of the name, and a config key SHALL match only by the documented name of a tool.

#### Scenario: A script with a name in Polish

- **WHEN** Claude edits the script `sprawdz` of `package.json` that runs `eslint .`
- **THEN** the user gets an ask

### Requirement: Protected files

An edit of a file that holds a bound or a gate of the project SHALL get an ask.
The list of protected files SHALL include each `limits` file.

#### Scenario: A `limits` file

- **WHEN** Claude edits a `limits` file
- **THEN** the user gets an ask

### Requirement: Unreadable command

When the shell parser cannot read a command, the hook SHALL treat it as a command that needs an ask, not as a safe command.

#### Scenario: A command the parser cannot read

- **WHEN** a `Bash` command hides its name from the parser
- **THEN** the user gets an ask
