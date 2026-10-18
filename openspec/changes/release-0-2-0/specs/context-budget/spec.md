# Spec Delta: `context-budget`

## Purpose

The window that claudetto uses, as the status line shows it, and the prompt cache that keeps a pause cheap.

## ADDED Requirements

### Requirement: The Status Line Shows the Effective Window

The system SHALL show the window that claudetto uses for the main session and for each subagent, not the window of the model.

#### Scenario: A Main Session on a 1M Model

- **WHEN** the status input has `context_window_size` 1000000
- **THEN** the context segment shows `of 300k`

#### Scenario: A Haiku Subagent

- **WHEN** a subagent row has model `claude-haiku-5-5` and `contextWindowSize` 1000000
- **THEN** the row shows the Haiku window of `src/kernel/budget.ts`, not `1000k`

### Requirement: The Prompt Cache Outlives a Short Pause

The system SHALL set the prompt cache TTL of the main session to one hour in the settings snippet.

#### Scenario: The Setup Snippet

- **WHEN** the setup writes its settings snippet
- **THEN** the snippet sets the prompt cache TTL of the main session to `1h`
