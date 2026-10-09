# Spec Delta

## Purpose

Defines the model roster and how the model and effort of each agent are chosen.
dotclaude has no router, no router table, and no data file of task classes (design D12, D13, D35).
The frontmatter of `agents/*.md` that Claude Code documents carries the choice.

## ADDED Requirements

### Requirement: Frontmatter carries the choice

The `model`, `effort`, and `maxTurns` of each dotclaude agent SHALL come only from the frontmatter of its `agents/*.md` file.
dotclaude SHALL NOT rewrite `model` or `effort` in `turn.step`, in `agent.spawn`, or in a `PreToolUse` hook on `Agent`.
No file SHALL hold a table that maps a task class to a model and effort pair, a `MAIN_EFFORT` set, or a table of allowed efforts.

#### Scenario: No router code

- **WHEN** a test lists `plugins/dotclaude/features/` and `plugins/dotclaude/hooks/hooks.json`
- **THEN** it finds no `router` folder, no `data.mjs` router table, and no hook on `Agent` that returns `updatedInput`

#### Scenario: Frontmatter default

- **WHEN** an agent runs with no `model` or `effort` in the `Agent` call
- **THEN** the request carries the `model` and `effort` of the agent file

### Requirement: Main loop keeps the session choice

dotclaude SHALL keep the model and effort that the user set for the main loop.
dotclaude SHALL NOT switch the main-loop model, because a model switch rebuilds the prompt cache and an effort switch does not.

#### Scenario: Model switch by the user

- **WHEN** the user switches the model in a session
- **THEN** dotclaude changes neither the model nor the effort of the next request

### Requirement: Explicit choices win

The coordinator MAY pass `model` and `effort` in an `Agent` call, as the tool documents.
dotclaude SHALL NOT override them.
dotclaude SHALL NOT set `CLAUDE_CODE_EFFORT_LEVEL` or `CLAUDE_CODE_SUBAGENT_MODEL_FORCE`, because each defeats the frontmatter.

#### Scenario: Explicit model

- **WHEN** the `Agent` input has `model: "opus"`
- **THEN** the subagent runs on Opus

### Requirement: Roster

The roster SHALL be `claude-opus-5-5`, `claude-sonnet-5-5`, `claude-haiku-5-5`, and `claude-fable-5-1`, or `claude-mythos-5-1` for an account in CVP.
A CVP account gets Mythos 5.1 in place of Fable 5.1 at the same cost, so the roster SHALL NOT hold both.

#### Scenario: Roster ids

- **WHEN** a test reads the roster
- **THEN** it holds the four ids, with `claude-fable-5-1` or `claude-mythos-5-1` and not both

### Requirement: Fable and Mythos on selection

Fable 5.1 and Mythos 5.1 SHALL have no agent, and SHALL run only when the user selects them.
The wiki SHALL document how the user checks that Mythos 5.1 serves the account (`research/account.md`).

#### Scenario: No agent

- **WHEN** a test reads the `model` of each agent file
- **THEN** none is `claude-fable-5-1` or `claude-mythos-5-1`

### Requirement: No Haiku 4.5

`claude-haiku-4-5` SHALL NOT be in the roster, in `availableModels`, or in any pin.
The agent files SHALL use the full id `claude-haiku-5-5` and not the `haiku` alias, because the alias resolves to Haiku 4.5 on Bedrock, Vertex, and Foundry.

#### Scenario: Old model

- **WHEN** a test finds `claude-haiku-4-5` in the snippet or in an agent file
- **THEN** the test fails

#### Scenario: Alias

- **WHEN** a test reads the `model` of each agent file
- **THEN** each is a full model id of the roster

### Requirement: Search decides the frontmatter

The evals MAY search the frontmatter of an agent role.
When it does, a search SHALL run the cases of one role, try pairs from the cheapest, and stop at the first pair with no loss in the rates that the suite can express.

#### Scenario: Cheaper pair passes

- **WHEN** Haiku 5.5 at `medium` shows no loss for the `investigator` role
- **THEN** the agent file holds Haiku 5.5 at `medium` or a cheaper passing pair

#### Scenario: Rates compared

- **WHEN** a search compares a pair
- **THEN** it compares the resolve rate, the over-claim rate, the policy-violation rate, and the wrongful-revert rate, for each rate that the suite can express

### Requirement: Search result as prose

The result of a search SHALL be written into the agent file and into the wiki as prose, and SHALL NOT be written into a table, a report file, or a data file.

#### Scenario: Record

- **WHEN** the frontmatter of an agent changes from a search
- **THEN** the wiki gives the date and the figures of the run that supports it

### Requirement: Inferred pair

Where the cases do not separate the pairs, the agent file SHALL hold the pair that the effort guide of Anthropic supports, and the wiki SHALL mark that pair as inferred.

#### Scenario: Cases do not separate

- **WHEN** a search finds no difference between pairs
- **THEN** the agent file holds the pair of the effort guide, and the wiki marks it as inferred

### Requirement: Haiku context bound

A Haiku 5.5 subagent SHALL report before its context reaches 100K tokens, because each request above 100K prompt tokens costs 5x on Haiku 5.5.
The bound is `HAIKU_CONTEXT_MAX` of the `context-bound` capability.
No rule SHALL move a task to another model by its prompt size.

#### Scenario: Long Haiku run

- **WHEN** the context of a Haiku 5.5 subagent passes `HAIKU_CONTEXT_MAX`
- **THEN** the subagent gets the report-now message and its model does not change
