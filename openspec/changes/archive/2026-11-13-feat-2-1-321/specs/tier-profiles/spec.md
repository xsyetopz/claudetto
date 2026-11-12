## MODIFIED Requirements

### Requirement: A Tool Result Does Not Carry a Haiku Request Past the Price Step

A tool result SHALL be withheld when it would take the next request of a Haiku 5.5 loop over 100,000 prompt tokens.

#### Scenario: Result Would Cross the Step

- **WHEN** a tool call made by a step that `claude-haiku-5-5` answered returns a result, and that step's prompt and output tokens, the step's results already passed, and this result's estimated tokens sum to more than 100,000
- **THEN** the model reads a withheld result that names its estimated size, the 100,000 step, and how to ask for less, and no request carries the result

#### Scenario: Result Fits

- **WHEN** the same sum is 100,000 or less
- **THEN** the result reaches the model unchanged

#### Scenario: Other Model

- **WHEN** the request of the step that made the call names a model other than Haiku 5.5
- **THEN** the result reaches the model unchanged, whatever its size, without waiting for the step to end

#### Scenario: Several Calls in One Step

- **WHEN** a Haiku 5.5 step makes two calls whose results each fit alone but together cross the step
- **THEN** the result that returns first reaches the model unchanged, and the second is withheld

#### Scenario: Step Ends with No Reading

- **WHEN** the step that made the call ends with no `usage`
- **THEN** the result reaches the model unchanged

#### Scenario: Step Streams Past the Budget

- **WHEN** a Haiku 5.5 step still streams when less than 1 s of the call hook's 10 s budget is left
- **THEN** the result reaches the model unchanged, and the hook ends inside its budget

#### Scenario: The Prompt Is Read from the Step

- **WHEN** the sum is computed
- **THEN** the prompt is read from the `usage` of the step that made the call, and the result's size is estimated from its text
- **AND** the check is needed because the price sum is checked between calls (`plugins/claudetto/hooks/turn.step/usePriceStep/price-step.ts`, tested by `price-step.test.ts` in the same folder)

#### Scenario: The Wait Ends before the Hook Budget

- **WHEN** the hook waits on the step's `usage`
- **THEN** the wait ends at least 1 s before the call hook's 10 s budget, because a hook that runs past its budget twice unloads the plugin

### Requirement: Agents Inherit the Tier

Setup SHALL write `CLAUDE_CODE_SUBAGENT_MODEL` as `claude-sonnet-5-5` in the "Models and windows" group. An agent file that names no `model:` line, as `work` does, SHALL run on it. The order of choice is the per-call `model`, then the agent field, then `CLAUDE_CODE_SUBAGENT_MODEL`, then the main model (`clawdipedia` route `extend/subagents/frontmatter`, row `model`, checked 2026-10-27).

#### Scenario: Subagent Model

- **WHEN** a plugin agent with no `model:` line starts with no model passed in the call
- **THEN** it runs on `claude-sonnet-5-5`
