# Spec Delta: `decision-api`

## Purpose

Gives Claude an opt-in second opinion on a choice, through Jev or a small Claude model, so that a choice that the facts can settle does not go to the user.

## ADDED Requirements

### Requirement: Opt-in

The decision API SHALL be off until the user turns it on.
The `decide` option SHALL have the values `off`, `claude`, and `jev`, and its default SHALL be `off`.
With `off`, the plugin SHALL register no `pick` tool and SHALL make no model call and no Jev request.
Only the value `jev` with a Jev key SHALL send data to the Jev API.

#### Scenario: Default install

- **WHEN** the core plugin is installed with no `decide` setting
- **THEN** no `pick` tool exists, and no model call and no request to the Jev API goes out

#### Scenario: Claude chosen

- **WHEN** the user sets `decide` to `claude`
- **THEN** a `pick` call uses the small Claude model, and no request goes to the Jev API

### Requirement: Pick with confidence

A `pick` call SHALL take a question, the facts, and two or more options with distinct keys, and SHALL give one option key and a confidence.

#### Scenario: A valid pick

- **WHEN** Claude calls `pick` with a question, facts, and 3 options
- **THEN** the result has one of the 3 keys and a confidence from 0 to 1

#### Scenario: Duplicate keys

- **WHEN** two options have the same key
- **THEN** the call fails with an input error and makes no request

### Requirement: Errors are not lost

When the backend fails, the CLI SHALL give the error with a non-zero exit code.
The result of a failed `pick` call SHALL keep the text of the error.

#### Scenario: The backend is down

- **WHEN** the backend gives an error
- **THEN** the CLI exits with a non-zero code and prints the error
