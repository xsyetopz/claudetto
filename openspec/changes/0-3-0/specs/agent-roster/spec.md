## Purpose

claudetto gives Claude a small set of its own subagents, each with a fixed model, effort, and tool list, and hides the built-in agents.

## ADDED Requirements

### Requirement: Own Agents Only

The system SHALL offer only claudetto agents to the `Agent` tool.
`general-purpose`, `Explore`, `Plan`, `claude`, and `statusline-setup` SHALL NOT be in the agent list, and a call to one of them SHALL fail with a message that names the claudetto agents.

#### Scenario: Built-In Type

- **WHEN** Claude calls `Agent` with `subagent_type: "Explore"`
- **THEN** the call does not start an agent, and the result names the claudetto agents

#### Scenario: Agent List

- **WHEN** a session starts
- **THEN** the agent list in the context has only `claudetto:` agents

### Requirement: Fixed Agent Settings

Each claudetto agent SHALL set `model`, `effort`, `tools`, and `omitClaudeMd`, and it SHALL NOT set `maxTurns` unless an eval shows a loop that a limit stops.
Its `tools` list SHALL hold only the tools that its task needs, and its description SHALL be one line with its trigger.
Its result to the parent SHALL be short: what it found or changed, with paths, and each block.

#### Scenario: Read-Only Agent

- **WHEN** a read-only search agent runs
- **THEN** its tool list has no `Edit`, `Write`, or `Agent`
- **AND** its start context is smaller than the start context of `general-purpose` on 0.2.0, measured in the transcript `usage`

### Requirement: Call with No Type

The system SHALL route an `Agent` call with no `subagent_type` to the claudetto default agent.

#### Scenario: No Type

- **WHEN** Claude calls `Agent` with no `subagent_type`
- **THEN** the default claudetto agent runs with its own `model` and `effort`

### Requirement: Effort Is Not Forced

The system MUST NOT set `CLAUDE_CODE_EFFORT_LEVEL` or `CLAUDE_CODE_SUBAGENT_MODEL_FORCE`, because each one overrides the settings of each agent.

#### Scenario: Snippet Check

- **WHEN** setup writes the snippet
- **THEN** the snippet has neither env var

### Requirement: Cap by Plan

The system SHALL cap the subagents that run at once by the plan of the login: 2 for Pro, 4 for Max 5x, and 6 for Max 20x.
With no known plan, it SHALL write no cap.

#### Scenario: Max 20x

- **WHEN** setup runs on a login with the Max 20x plan
- **THEN** the settings have `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS: "6"`

#### Scenario: API Key

- **WHEN** setup runs with no subscription login
- **THEN** the settings have no `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS`

### Requirement: No Forced Wait

The text that claudetto gives Claude SHALL NOT tell it to wait for an agent and do nothing else.
It SHALL tell Claude to go on with work that does not depend on the agent.

#### Scenario: Work While an Agent Runs

- **WHEN** an eval task has a background agent and an independent second step
- **THEN** Claude makes a tool call for the second step before the agent ends, in each repeat run
