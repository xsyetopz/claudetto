# Spec Delta: `lab-tools`

## Purpose

Gives the tools that measure `claudetto` against vanilla Claude Code: a logging proxy, an eval comparison, an isolated sandbox config, and the settings schema of the installed bundle.

## ADDED Requirements

### Requirement: Logging proxy

The capture tool SHALL log each API request and response of a session to a file, with no login token in the log.

#### Scenario: A captured session

- **WHEN** a session runs through the capture tool
- **THEN** the log holds each request body, and no line holds the token

### Requirement: Eval comparison checks its input

The comparison SHALL fail when an arm has no valid result, also when the run exits with 0.
A count with no `input_tokens` SHALL be an error, not `NaN`.

#### Scenario: An empty arm

- **WHEN** one arm of a comparison has no result rows
- **THEN** the comparison exits with a non-zero code and names the arm

### Requirement: Isolated sandbox

The sandbox SHALL run Claude Code with a config folder apart from the config of the user, and SHALL load only the plugins it names.

#### Scenario: Sandbox run

- **WHEN** the user runs the sandbox
- **THEN** the session reads no file from the user config folder except the login

### Requirement: Schema of the installed bundle

The schema builder SHALL build the JSON Schema of `settings.json` and `managed-settings.json` from the installed Claude Code bundle, with a version table for each supported version.

#### Scenario: A new Claude Code version

- **WHEN** the installed version has no version table
- **THEN** the builder stops and names the version, and writes no schema

### Requirement: A check fails when no plugin loaded

The frontmatter check SHALL fail when no plugin loaded.

#### Scenario: No plugin

- **WHEN** the check runs and the session loaded no plugin
- **THEN** the check fails
