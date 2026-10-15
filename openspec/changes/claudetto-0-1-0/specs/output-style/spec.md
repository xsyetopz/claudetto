# Spec Delta: `output-style`

## Purpose

Gives a concise output style that leads with the result and cuts padding, and keeps the coding instructions of Claude Code.

## ADDED Requirements

### Requirement: Concise style

The core plugin SHALL ship the output style `claudetto:Concise`.
It SHALL keep the coding instructions of Claude Code.

#### Scenario: Style chosen

- **WHEN** the user picks `claudetto:Concise`
- **THEN** the system prompt holds the style text and the coding instructions

### Requirement: No padding

With the style on, replies SHALL lead with the result and SHALL have no apology, no preamble, and no recap.

#### Scenario: Eval of a reply

- **WHEN** the style eval runs a task
- **THEN** the grader finds the result in the first sentence of the reply

### Requirement: Evals that can fail

Each eval of the style SHALL check the behavior, not the words, and SHALL fail on a wrong fix.

#### Scenario: A wrong fix

- **WHEN** a fixture run gives a wrong fix in correct words
- **THEN** the eval fails

#### Scenario: A failed tool counts as no check

- **WHEN** a run claims a check and `npm test` exited with an error
- **THEN** the eval does not count the check as passed
