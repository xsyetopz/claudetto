# agent-definitions Specification

## Purpose

Sets the limits on the dotclaude agent definitions, so that the agent listing in each request stays small and clear.

## Requirements

### Requirement: Description length

The `description` of each dotclaude agent SHALL have 300 characters or fewer.
The bound SHALL be in `tools/limits.mjs`, because only tests read it.

#### Scenario: Long description

- **WHEN** an agent file has a description of 301 characters
- **THEN** the test fails and names the agent

### Requirement: Description content

Each agent description SHALL say what the agent does and when to delegate to it.
It SHALL use no forceful words.

#### Scenario: Validation

- **WHEN** the validate step reads the agent files
- **THEN** each description has a "what" and a "when" part

### Requirement: Model and effort from the frontmatter

The model and effort of an agent SHALL come only from its frontmatter (the `model-router` capability).
The models are `claude-opus-5-5`, `claude-sonnet-5-5`, and `claude-haiku-5-5`.
No agent has `claude-fable-5-1` or `claude-mythos-5-1` as its default.
`claude-haiku-4-5` SHALL NOT be a pin.

#### Scenario: Old pin

- **WHEN** an agent file pins `claude-haiku-4-5`
- **THEN** the pin test fails

### Requirement: Pins in one place

The frontmatter of `agents/*.md` SHALL be the only source of the model, the effort, and `maxTurns` of each agent, and no code list such as `AGENTS` SHALL repeat them.
The pin test SHALL read the frontmatter and check that the model is in the roster and that the effort is one that Claude Code accepts.
The pin test SHALL NOT read a table of allowed efforts for each model in `features/`.

#### Scenario: Effort not accepted

- **WHEN** an agent file has an effort value that Claude Code does not accept
- **THEN** the pin test fails and names the agent

#### Scenario: Mismatch

- **WHEN** an agent file has a model that is not one of the roster models
- **THEN** the test fails

### Requirement: Rules repeated in the agent body

A subagent does not inherit the output style or the shared sections of the system prompt.
Each agent body SHALL repeat the two or three rules that matter for its role.

#### Scenario: Agent body

- **WHEN** a test reads an agent file
- **THEN** the body has the scope rule and the verification rule for its role

### Requirement: Keep the work under an unsupported claim

Each agent body SHALL tell the agent to keep finished work and report to the parent when a claim of fault has no workspace evidence.

#### Scenario: Agent body

- **WHEN** a test reads an agent file
- **THEN** the body has the keep-the-work rule

### Requirement: Roster of five agents

dotclaude SHALL define exactly five agents: `investigator`, `implementer`, `debugger`, `reviewer`, and `test-runner` (design D25).
`web-researcher` SHALL NOT exist, because `investigator` takes its web lookups.
No agent SHALL have the `Agent` tool, so that no agent starts another agent.
The `maxTurns` of each agent SHALL hold one spare turn for the report, because a subagent that reaches `maxTurns` returns no report.

#### Scenario: Agent files

- **WHEN** a test lists `agents/*.md`
- **THEN** it finds the five names and no other

#### Scenario: Defaults

- **WHEN** a test reads the frontmatter of `agents/*.md`
- **THEN** `investigator` is Haiku 5.5 medium 31, `implementer` is Haiku 5.5 medium 61, `debugger` is Haiku 5.5 high 61, `reviewer` is Sonnet 5.5 medium 41, and `test-runner` is Haiku 5.5 low 16

### Requirement: Built-in agents off

The settings snippet SHALL turn off the built-in agents `Explore`, `Plan`, `general-purpose`, `claude-code-guide`, and `statusline-setup`, with `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS=1` for `Explore` and `Plan`, and a `permissions.deny` entry `Agent(<name>)` for each of the other three.
The dotclaude agents take their work, and dotclaude has its own status line.

#### Scenario: Agent listing

- **WHEN** a session starts with the snippet applied
- **THEN** the agent listing has only the five dotclaude agents
