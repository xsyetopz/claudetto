# agent-roster Specification

## Purpose
claudetto gives Claude a small set of its own subagents, each with a fixed model, effort, and tool list, and hides the built-in agents.

## Requirements

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

Each claudetto agent SHALL set `model`, `effort`, `tools`, and `omitClaudeMd`, and it SHALL NOT set `maxTurns`.
The roster SHALL have the categories Inspector, Modifier, and Tester, and these settings:
`Artemis` Haiku 5.5 at `low`, `Zeus` Sonnet 5.5 at `medium`, `Athena` Sonnet 5.5 at `medium`, `Hermes` Sonnet 5.5 at `medium`, `Hephaestus` Sonnet 5.5 at `medium`, and `Apollo` Haiku 5.5 at `low`.
Its `tools` list SHALL hold only the tools that its task needs, and its description SHALL be one line that starts with "Use proactively" and names the moment.
Its result to the parent SHALL be short: what it found or changed, with paths, and each block.
`Hermes` SHALL return its report as its final message and have no `Write`.
`Apollo` SHALL have no `Edit` or `Write`.

#### Scenario: Read-Only Agent

- **WHEN** the roster test reads `Artemis`, `Zeus`, `Athena`, `Hermes`, and `Apollo`
- **THEN** no tool list has `Edit`, `Write`, or `Agent`

#### Scenario: Reviewer Effort

- **WHEN** the roster test reads `Athena`
- **THEN** it has Sonnet 5.5 at `medium`

#### Scenario: Haiku Work

- **WHEN** the roster test reads each agent on Haiku 5.5
- **THEN** it is `Artemis` or `Apollo`, and it has no `WebSearch` or `WebFetch`

#### Scenario: Researcher Report

- **WHEN** `Hermes` finishes a web question
- **THEN** the report is its final message, and it wrote no file

#### Scenario: Description

- **WHEN** the roster test reads each description
- **THEN** each starts with "Use proactively"

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

### Requirement: UpperCase Names

Each agent file SHALL have an UpperCase file name and an equal `name`, so Claude Code names it `claudetto:<Name>`.
The lowercase names SHALL go.

#### Scenario: Name Loads

- **WHEN** a `just sandbox` session spawns the agent of `agents/Scout.md`, because the hook lab loads no agent file
- **THEN** the agent type is `claudetto:Artemis`

#### Scenario: Deny Rule

- **WHEN** `permissions.deny` holds `Agent(claudetto:Artemis)` and Claude calls `Agent` with `claudetto:Artemis`
- **THEN** the call is denied

### Requirement: Delegation by Fit

The body of `claudetto:main` SHALL name each agent of the roster with the work that it fits: `claudetto:Zeus` first for work over more than one file set, `claudetto:Hephaestus` for one planned edit step with its check, in parallel on separate file sets, `claudetto:Apollo` after each group of `Hephaestus`s, `claudetto:Athena` for a review of a finished diff, `claudetto:Artemis` for a search over many files, and `claudetto:Hermes` for web research.
It SHALL tell Claude to keep decisions and the talk with the user in the main context.

#### Scenario: Multi-File Search

- **WHEN** an eval task needs a search over more than 20 files and an edit that depends on it
- **THEN** Claude starts `claudetto:Artemis` for the search, in each repeat run

#### Scenario: Split Work

- **WHEN** an eval task changes two separate file sets
- **THEN** Claude starts `claudetto:Zeus`, then one `claudetto:Hephaestus` for each file set in parallel, in each repeat run

#### Scenario: Finished Diff

- **WHEN** an eval task ends with a diff of more than one file
- **THEN** Claude starts `claudetto:Athena` before it reports, in each repeat run

#### Scenario: One-Line Fix

- **WHEN** an eval task is a one-line fix in a named file
- **THEN** Claude starts no agent

### Requirement: Delegation by Cost

The body of `claudetto:main` SHALL tell Claude to pick the cheapest agent that fits the work, and to give Haiku 5.5 no research, fact check, or judgment.

#### Scenario: Check Run

- **WHEN** an eval task needs the test suite run and its failures listed
- **THEN** Claude starts `claudetto:Apollo`, not `claudetto:Hephaestus`

### Requirement: No Model in Agent Calls

The body of `claudetto:main` SHALL tell Claude to pass no `model` in an `Agent` call, so the frontmatter of the agent applies.

#### Scenario: Agent Call

- **WHEN** an eval run starts `claudetto:Hephaestus`
- **THEN** the call holds no `model` and the agent runs Sonnet 5.5
