# Spec Delta: `role-agents`

## Purpose

Gives the root model a small set of role agents for multi-agent work, with the root model as the orchestrator, and with a model and effort for each role that a measurement selects.

## ADDED Requirements

### Requirement: Roles

The core plugin SHALL ship the role agents `debugger`, `implementer`, `investigator`, `planner`, `researcher`, and `reviewer`.
Each agent SHALL have the tools that its role needs and no others.

#### Scenario: A tool that an agent does not have

- **WHEN** an agent prompt names a tool
- **THEN** the agent has that tool in its frontmatter

### Requirement: Model and effort from the sweep

The `model` and `effort` of each agent SHALL come from the effort sweep on Claude Code 2.1.300.
On a tie, the cheaper setting SHALL win.
No Opus agent SHALL have an effort above `high`.

#### Scenario: Opus agent

- **WHEN** an agent uses Opus
- **THEN** its effort is `low`, `medium`, or `high`

#### Scenario: Source of a value

- **WHEN** an agent has a `model` and an `effort`
- **THEN** the results file of the sweep names that setting for the role

### Requirement: Write scope of the planner

The `planner` SHALL write only inside a MiniSpec change folder, `minispec/changes/<name>/`.
A `tool.call` hook SHALL deny a `Write` or an `Edit` of the `planner` for any other path.

#### Scenario: The planner writes a source file

- **WHEN** the `planner` tries to write a file outside the change folder
- **THEN** the write is denied

### Requirement: Report bound without a note on each call

A subagent over its report bound SHALL get one note to report now, not a note on each tool call.

#### Scenario: Many calls over the bound

- **WHEN** a subagent makes 10 tool calls after it passes its bound
- **THEN** it gets the report-now note one time

### Requirement: Work stays with the agent

An agent SHALL NOT push a decision or a command to the user that the agent can settle from the code, the docs, or a check.
A subagent cannot ask the user, so it SHALL give each decision that is the user's, with the options and one fact for each, to its caller in its report.
The caller SHALL ask the user through `AskUserQuestion`.

#### Scenario: A question in plain text

- **WHEN** an agent eval transcript ends with a question in plain text
- **THEN** the eval grades the run as failed

### Requirement: An effort floor and a turn bound

Each agent SHALL have an `effort` of `medium` or more, because Sonnet 5.5 and Haiku 5.5 skip checks at `low`.
Each agent SHALL have a bound on its turns: `maxTurns` in the frontmatter when a plugin agent accepts it, else a count in the `turn.step` handler.

#### Scenario: A new agent at `low`

- **WHEN** an agent file sets `effort: low`
- **THEN** `just validate` fails and names the agent

#### Scenario: The turn bound

- **WHEN** an agent reaches its bound of turns
- **THEN** the agent ends, and its caller gets a report that names the bound
