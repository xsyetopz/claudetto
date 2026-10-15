# Spec Delta: `decision-api`

## Purpose

Gives Claude an opt-in second opinion on a choice, through Jev or a small Claude model, so that a choice that the facts can settle does not go to the user.

## ADDED Requirements

### Requirement: Opt-in

The Jev backend SHALL be off until the user turns it on.
With Jev off, no data SHALL go to the Jev API.

#### Scenario: Default install

- **WHEN** the core plugin is installed with no `decide` setting
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

#### Scenario: The backend is down

- **WHEN** the backend gives an error
- **THEN** the CLI exits with a non-zero code and prints the error
