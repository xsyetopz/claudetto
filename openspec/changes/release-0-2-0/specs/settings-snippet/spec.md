# Spec Delta: `settings-snippet`

## Purpose

The tools and the env vars that the settings snippet of the setup turns on or off.

> `trim-0-2-0` removes the turn gate, so the scenario "The turn gate names `TaskStop`" does not apply.

## ADDED Requirements

### Requirement: No denied tool that claudetto needs

The system SHALL not deny a tool that a claudetto text or hook tells the model to use.

#### Scenario: The turn gate names `TaskStop`

- **WHEN** a test reads each prompt of the plugin and the deny list of the snippet
- **THEN** no tool that a prompt names is in the deny list

### Requirement: Each env var has a reason

The system SHALL set an env var in the snippet only when `src/wiki/reference/Env.md` has a row for it with the decision `set` and a source.

#### Scenario: An env var with no row

- **WHEN** the snippet sets an env var that has no `set` row in `Env.md`
- **THEN** the test of the snippet fails and names the env var
