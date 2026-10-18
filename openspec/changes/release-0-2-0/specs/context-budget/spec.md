# Spec Delta: `context-budget`

## Purpose

The window that claudetto uses, as the status line shows it, and the prompt cache that keeps a pause cheap.

> `trim-0-2-0` removes `just measure`, `just start-run`, and `START_TOKENS`, so the scenario "Measure the empty session" does not apply.

## ADDED Requirements

### Requirement: The status line shows the effective window

The system SHALL show the window that claudetto uses for the main session and for each subagent, not the window of the model.

#### Scenario: A main session on a 1M model

- **WHEN** the status input has `context_window_size` 1000000
- **THEN** the context segment shows `of 300k`

#### Scenario: A Haiku subagent

- **WHEN** a subagent row has model `claude-haiku-5-5` and `contextWindowSize` 1000000
- **THEN** the row shows the Haiku window of `src/kernel/budget.ts`, not `1000k`

### Requirement: The prompt cache outlives a short pause

The system SHALL set the prompt cache TTL of the main session to one hour in the settings snippet.

#### Scenario: The setup snippet

- **WHEN** the setup writes its settings snippet
- **THEN** the snippet sets the prompt cache TTL of the main session to `1h`

### Requirement: A small empty session

The system SHALL add at most half of the tokens that `0.1.0-alpha.1` adds to an empty session.

#### Scenario: Measure the empty session

- **WHEN** `just measure` reads the transcript of a fresh `just start-run` session
- **THEN** it exits 0 under `START_TOKENS` of `tools/limits.ts`, which is half of the `0.1.0-alpha.1` value
