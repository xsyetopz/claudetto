# model-router Specification

## Purpose

Defines the deterministic choice of model and effort for each task, the routes that apply it, and its limits.

## Requirements

### Requirement: Deterministic router

dotclaude SHALL choose the model and effort of a task with rules on the task text and state.
The router SHALL NOT call a model to classify a task.
The router SHALL classify the user prompt in `prompt.submit` and a subagent task in `agent.spawn`.

#### Scenario: Same input

- **WHEN** the router gets the same task text and state twice
- **THEN** it returns the same model and effort

### Requirement: Applied per request

The router SHALL apply the model and effort in `turn.step` for the main loop and for each subagent.
A classic `PreToolUse` hook on `Agent` with `updatedInput` SHALL be the fallback route, and it SHALL use a model alias.

#### Scenario: Subagent request

- **WHEN** the router decides Haiku 5.5 at low effort for a search subagent
- **THEN** the request of that subagent carries that model and effort

### Requirement: Router cap

The router SHALL keep its own effort cap, because the profile sets `maxEffortLevel` to `max`, which means no cap.
The router SHALL NOT choose `max` on any model by default, and SHALL NOT choose `xhigh` on Sonnet 5.5 by default.
The router SHALL NOT raise the effort above the session effort that the user set.

#### Scenario: User set low

- **WHEN** the user sets the session effort to `low`
- **THEN** the router chooses no subagent effort above `low`

### Requirement: Router respects explicit choices

The router SHALL leave alone an Agent input that already has a `model` or an `effort`.
The router SHALL skip `fork` spawns.
When `CLAUDE_CODE_EFFORT_LEVEL` or `CLAUDE_CODE_SUBAGENT_MODEL_FORCE` is set, the router SHALL report that it cannot route and SHALL NOT route.

#### Scenario: Explicit model

- **WHEN** the Agent input has `model: "opus"`
- **THEN** the router leaves `model` as it is

### Requirement: Roster

The roster SHALL be `claude-opus-5-5`, `claude-sonnet-5-5`, `claude-haiku-5-5`, and `claude-fable-5-1`, or `claude-mythos-5-1` for an account in CVP.
A CVP account gets Mythos 5.1 in place of Fable 5.1 at the same cost, so the roster SHALL NOT hold both.
Setup SHALL grant Mythos 5.1 only when the user says that the account is in CVP and a probe call proves that Mythos 5.1 serves the account.
Fable 5.1 and Mythos 5.1 SHALL have no task class in the router table, and SHALL run only when the user selects them.
`claude-haiku-4-5` SHALL NOT be in the roster, in `availableModels`, or in any pin.
`enforceAvailableModels` SHALL be `true` in the profile.

#### Scenario: Old model

- **WHEN** a test finds `claude-haiku-4-5` in the profile or in an agent file
- **THEN** the test fails

#### Scenario: CVP account

- **WHEN** the user answers yes to the CVP question of setup, and the probe call with `--model claude-mythos-5-1` reports only `claude-mythos-5-1` in `modelUsage`
- **THEN** the profile has `claude-mythos-5-1` and not `claude-fable-5-1` in `availableModels`

#### Scenario: Claim without access

- **WHEN** the user answers yes, and the probe call fails or another model serves it
- **THEN** the profile has `claude-fable-5-1`, and setup tells the user that the account cannot call Mythos 5.1

### Requirement: Table from evals

The router table SHALL start from the task classes of the research and SHALL be tuned by the eval suite.
For each task class, the table SHALL hold the cheapest model and effort pair that shows no loss against the reference pair in resolve rate, over-claim rate, policy-violation rate, and wrongful-revert rate.
Where the cases do not separate the pairs, or no case measures the row, the table SHALL hold the pair that the effort guide of Anthropic supports, and the wiki SHALL mark that row as inferred.
The subagent table SHALL be: `search`, `web`, `bulk`, `scoped`, `plan`, and `orchestration` Haiku 5.5 `medium`, `tests` Haiku 5.5 `low`, `debug` Haiku 5.5 `high`, `review` Sonnet 5.5 `medium`, and `audit` Sonnet 5.5 `high`.
A task with a prompt above 100K tokens SHALL NOT go to Haiku 5.5.
A Haiku 5.5 subagent SHALL report before its context reaches 100K tokens, because each request above 100K prompt tokens costs 5x on Haiku 5.5.

#### Scenario: Cheaper pair passes

- **WHEN** Haiku 5.5 at `medium` shows no loss for the search class
- **THEN** the table holds Haiku 5.5 at `medium` or a cheaper passing pair for that class

#### Scenario: Long prompt

- **WHEN** a Haiku 5.5 task has a prompt over 100K tokens
- **THEN** the router sends it to Sonnet 5.5 at `medium`

#### Scenario: Debug escalation

- **WHEN** a debug task follows two failed fixes
- **THEN** the router sends it to Opus 5.5 at `medium`

#### Scenario: Record

- **WHEN** a table row changes
- **THEN** the wiki links the eval report that supports it

### Requirement: Open items recorded

The wiki SHALL record whether a full model id works in `agent.spawn`, how the `haiku` alias resolves on Bedrock, Vertex, and Foundry, and whether `maxEffortLevel` clamps a hook-set effort.

#### Scenario: Wiki check

- **WHEN** a test searches the router wiki page
- **THEN** it finds a result or an "open" mark for each of the three items

### Requirement: Main loop keeps its model

The router SHALL keep the model of the session in the main loop, and SHALL route only the effort, because an effort change keeps the prompt cache and a model change rebuilds it.
The router SHALL take the main-loop effort from `MAIN_EFFORT`: `plan` `high`, `review` `high`, `debug` `high`, and `orchestration` `medium`.
The router SHALL cap that effort by the effort of the step and by `effortLevel`.
The router SHALL change the effort of the main loop only at the first step of a turn.
The router SHALL NOT have a model-switch rule for the main loop.

#### Scenario: Plan prompt

- **WHEN** the session model is Opus 5.5 and the prompt is a plan task
- **THEN** the router rewrites the first step of the turn to Opus 5.5 at `high`, and the model stays the model of the session

#### Scenario: Effort cap

- **WHEN** `effortLevel` is `low` and the prompt is a review task
- **THEN** the router sets the effort `low` and no higher

#### Scenario: Mid-turn step

- **WHEN** a turn has a second model request
- **THEN** the router keeps the model and effort of the first request of the turn
