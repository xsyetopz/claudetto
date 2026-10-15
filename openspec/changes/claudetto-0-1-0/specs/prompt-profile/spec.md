# Spec Delta: `prompt-profile`

## Purpose

Gives each Claude model a shorter system prompt and subagent block that keeps the coding instructions, so that each request uses fewer tokens with little or no loss of quality.

## ADDED Requirements

### Requirement: Variant built from the live block

Each prompt variant SHALL start from the system block that Claude Code 2.1.300 sends, captured from a live request.
The prompt extract of a bundle SHALL NOT be the source, because the 2.1.300 extract is a stale 2.1.299 copy (V6).

#### Scenario: The source of a variant

- **WHEN** a variant is built
- **THEN** its source file names the capture command and the Claude Code version of the live block

### Requirement: The intro rules stay

Each variant SHALL keep the rules of the `intro` section of the built-in prompt.

#### Scenario: A variant drops an intro rule

- **WHEN** a variant has no text for a rule of the built-in `intro` section
- **THEN** the prompt test fails and names the rule

### Requirement: Model of a spawn

A subagent spawned with no `model` SHALL get the block of the model that runs it, not the block of the parent model.

#### Scenario: Spawn with no model

- **WHEN** an Opus main thread spawns an agent whose frontmatter names Haiku and the call has no `model`
- **THEN** the agent gets the Haiku block

### Requirement: Compaction gate

The prompt SHALL agree with the compaction state.
With the handover on, no text SHALL say that the context is compacted.
With the compaction profile on, no text SHALL say that the context is handed over.

#### Scenario: Compaction profile on

- **WHEN** the compaction profile is on
- **THEN** the system prompt has no handover text

### Requirement: No setting that equals the default

The profile SHALL NOT set an env var or setting to the value that Claude Code already uses by default for the target models.

#### Scenario: A redundant switch

- **WHEN** the profile sets `CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT=1` and that is the default on the 5.5 models
- **THEN** the profile test fails and names the switch

### Requirement: Measured size

The build SHALL report the size of the first request of a new session with the profile, against vanilla Claude Code.
A variant SHALL NOT make the first request larger.

#### Scenario: Size report

- **WHEN** the size measurement runs
- **THEN** it gives the token count of the first request with and without the profile
