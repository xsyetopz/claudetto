# openspec-integration Specification

## Purpose

Defines how the dotclaude setup entry configures OpenSpec through the OpenSpec CLI, so that the spec workflow costs little context and the model can move it forward with little manual work.
Setup writes no Claude Code setting (design D35).

## Requirements

### Requirement: One delivery

Setup SHALL configure OpenSpec to deliver the workflows as skills only.
After setup, the project SHALL have no OpenSpec command copies of the same workflows.

#### Scenario: No duplicates

- **WHEN** setup configures OpenSpec in a project that has both `.claude/skills/openspec-*` and `.claude/commands/opsx/*`
- **THEN** only the skills remain, and `/context` lists each workflow once

### Requirement: Name-only listing

The wiki snippet SHALL set the OpenSpec skills to `name-only` in `skillOverrides`.

#### Scenario: Listing cost

- **WHEN** a session starts in a project with OpenSpec
- **THEN** each OpenSpec skill shows its name and no description in the skill listing
- **AND** the model can still invoke it

### Requirement: Core workflows

Setup SHALL keep the core OpenSpec profile: explore, propose, apply, update, sync, and archive.

#### Scenario: Workflows present

- **WHEN** setup finishes
- **THEN** each of the 6 core workflows is available

### Requirement: Telemetry off

Setup SHALL turn off OpenSpec telemetry.

#### Scenario: OpenSpec config

- **WHEN** setup finishes
- **THEN** the OpenSpec configuration has telemetry off

### Requirement: User consent

Setup SHALL ask before it runs an OpenSpec command that writes files.

#### Scenario: User declines

- **WHEN** the user declines the OpenSpec step
- **THEN** setup changes no OpenSpec file and no OpenSpec configuration
