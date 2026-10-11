## RENAMED Requirements

- FROM: `### Requirement: Roster of five agents`
- TO: `### Requirement: Agent suite`

## MODIFIED Requirements

### Requirement: Rules repeated in the agent body

A subagent does not inherit the output style or the shared sections of the system prompt.
Each agent body SHALL repeat the two or three rules that matter for its role, the exact tool-name rule, and the rule that a dotclaude hook note comes from the harness.
The generator SHALL write each repeated rule from its one source, and the check SHALL fail when a copy differs (design D12).

#### Scenario: Agent body

- **WHEN** a test reads an agent file
- **THEN** the body has the scope rule, the verification rule for its role, the tool-name rule, and the hook-note rule

#### Scenario: Copy differs

- **WHEN** an agent body has a repeated rule whose text differs from its source
- **THEN** the generator check fails and names the file

### Requirement: Agent suite

dotclaude SHALL define a suite of agents that replaces the built-in agents, with one or two purposes for each agent (design D18).
The suite SHALL be `explorer`, `investigator`, `researcher`, `planner`, `implementer`, `debugger`, `reviewer`, and `test-runner`.
An agent SHALL write only the paths that design D18 gives its role, and the guard SHALL deny its other writes with the reason.
No agent SHALL have the `Agent` tool, so that no agent starts another agent.
The model and effort of each agent SHALL put quality first, then savings, then speed.

#### Scenario: Agent files

- **WHEN** a test lists `agents/*.md`
- **THEN** it finds the eight names and no other

#### Scenario: Defaults

- **WHEN** a test reads the frontmatter of `agents/*.md`
- **THEN** `investigator` is Sonnet 5.5 medium, `implementer` is Sonnet 5.5 medium, `debugger` is Sonnet 5.5 high, `reviewer` is Opus 5.5 high, and `test-runner` is Haiku 5.5 low
- **AND** `explorer`, `researcher`, and `planner` hold the pairs that the search of `model-router` sets, or the inferred pairs of design D18

#### Scenario: Research notes

- **WHEN** `researcher` writes a notes file under the path of its brief
- **THEN** the write runs
- **AND** a write of `researcher` to another path is denied with the reason

#### Scenario: Read-only role

- **WHEN** `investigator`, `explorer`, `reviewer`, or `test-runner` calls `Edit` or `Write`
- **THEN** the call is denied

### Requirement: Built-in agents off

The settings snippet SHALL turn off the built-in agents `Explore`, `Plan`, `general-purpose`, `claude-code-guide`, and `statusline-setup`, with `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS=1` for `Explore` and `Plan`, and a `permissions.deny` entry `Agent(<name>)` for each of the other three.
The dotclaude suite takes their work, and `configure` sets up the status line.

#### Scenario: Agent listing

- **WHEN** a session starts with the snippet applied
- **THEN** the agent listing has only the eight dotclaude agents

## ADDED Requirements

### Requirement: Agent type always named

An `Agent` call SHALL reach a dotclaude agent.
When a setting picks the default agent, the snippet SHALL point it to `investigator`.
Else a hook SHALL deny an `Agent` call with no `subagent_type`, and its reason SHALL name each agent of the suite with its purpose (design D18).

#### Scenario: No type

- **WHEN** the session calls `Agent` with no `subagent_type`
- **THEN** the call runs on `investigator`, or the hook denies it and names the suite

### Requirement: Turn limit from measured runs

The `maxTurns` of each agent SHALL come from the turn counts of measured runs of that agent, with room for the report turns (design D2).
The wiki SHALL give the date, the run count, and the figures of the measure for each value.

#### Scenario: Pin and record

- **WHEN** a test reads the `maxTurns` of each agent file
- **THEN** each value is above the turn bound of `context-bound` plus the report turns, and the wiki names the measure of each value
