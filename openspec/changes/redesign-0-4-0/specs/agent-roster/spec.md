## ADDED Requirements

### Requirement: Agent Settings

Each claudetto agent SHALL set `model`, `effort`, `tools`, and `omitClaudeMd`, and it SHALL NOT set `maxTurns`.
The roster SHALL have the categories Inspector, Modifier, and Tester, and these settings:
`Artemis` Haiku 5.5 at `low`, `Zeus` Sonnet 5.5 at `medium`, `Athena` Sonnet 5.5 at `medium`, `Hermes` Sonnet 5.5 at `medium`, `Hephaestus` Sonnet 5.5 at `medium`, and `Apollo` Haiku 5.5 at `low`.
Its `tools` list SHALL hold only the tools that its task needs.

#### Scenario: Read-Only Agent

- **WHEN** the roster test reads `Artemis`, `Zeus`, `Athena`, `Hermes`, and `Apollo`
- **THEN** no tool list has `Edit`, `Write`, or `Agent`

#### Scenario: Reviewer Effort

- **WHEN** the roster test reads `Athena`
- **THEN** it has Sonnet 5.5 at `medium`

#### Scenario: Haiku Work

- **WHEN** the roster test reads each agent on Haiku 5.5
- **THEN** it is `Artemis` or `Apollo`, and it has no `WebSearch` or `WebFetch`

### Requirement: Agent Results

Each claudetto agent SHALL have a one-line description that names its job.
Its result to the parent SHALL be short: what it found or changed, with paths, and each block.
`Hermes` SHALL return its report as its final message and have no `Write`.
`Apollo` SHALL have no `Edit` or `Write`.

#### Scenario: Researcher Report

- **WHEN** `Hermes` finishes a web question
- **THEN** the report is its final message, and it wrote no file

## REMOVED Requirements

### Requirement: Fixed Agent Settings

**Reason**: Its scenario "Description" was a test of the wording of each description. The rule of `.claude/rules/tests.md` deletes a test of prose (the user, 2026-10-26).
**Migration**: The requirement "Agent Settings" and the requirement "Agent Results" keep each rule and each behavior scenario.
