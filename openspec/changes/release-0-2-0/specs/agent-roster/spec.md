# Spec Delta: `agent-roster`

## Purpose

The set of subagents that the core plugin ships, with the model, the effort, and the size of work of each one.

> Closed: `trim-0-2-0` removes the `agents` slice and the agent files, so this delta does not apply.

## ADDED Requirements

### Requirement: No Turn Cap

The system SHALL ship no agent file with a `maxTurns` key.

#### Scenario: An Agent File Has No Turn Cap

- **WHEN** `just validate` reads each file in `plugins/claudetto/agents/`
- **THEN** no file has `maxTurns` in its frontmatter

### Requirement: No Context Cap for Sonnet and Opus Subagents

The system SHALL not tell a Sonnet or Opus subagent to report because of its context size, and SHALL keep a Haiku subagent under the 100K price step without a stop of the run.

#### Scenario: A Subagent at 120K Tokens

- **WHEN** a Sonnet subagent calls a tool with 120K tokens of context
- **THEN** the `tool.call` hook adds no report-now text

### Requirement: Model by Size of Work

The system SHALL give Haiku 5.5 only to the roles `scout` and `fixer`, Sonnet 5.5 to `implementer`, `investigator`, and `researcher`, and Opus 5.5 to `planner`, `debugger`, and `reviewer`.

#### Scenario: The `planner` Model

- **WHEN** a test reads `plugins/claudetto/agents/planner.md`
- **THEN** its `model` is `claude-opus-5-5`

#### Scenario: No Haiku Role at `xhigh`

- **WHEN** a test reads each agent file with a Haiku model
- **THEN** its `effort` is `high`

#### Scenario: The Description Says the Size

- **WHEN** a test reads the `description` of each agent
- **THEN** each description names the size of work that fits the role
