# Spec Delta

## ADDED Requirements

### Requirement: A Tool Result Does Not Carry a Haiku Request Past the Price Step

A tool result SHALL be withheld when it would take the next request of a Haiku 5.5 loop over 100,000 prompt tokens, since the handoff trigger is checked between calls (`docs/window-weights.md`). The prompt SHALL be read from the `usage` of the step that made the call, and the result's size estimated from its text. A step answered by any other model SHALL be left alone.

#### Scenario: Result Would Cross the Step

- **WHEN** a tool call made by a step that `claude-haiku-5-5` answered returns a result, and that step's prompt and output tokens, the step's results already passed, and this result's estimated tokens sum to more than 100,000
- **THEN** the model reads a withheld result that names its estimated size, the 100,000 step, and how to ask for less, and no request carries the result

#### Scenario: Result Fits

- **WHEN** the same sum is 100,000 or less
- **THEN** the result reaches the model unchanged

#### Scenario: Other Model

- **WHEN** the step that made the call was answered by a model that is not Haiku 5.5
- **THEN** the result reaches the model unchanged, whatever its size

#### Scenario: Several Calls in One Step

- **WHEN** a Haiku 5.5 step makes two calls whose results each fit alone but together cross the step
- **THEN** the result that returns first reaches the model unchanged, and the second is withheld

#### Scenario: Step Ends with No Reading

- **WHEN** the step that made the call ends with no `usage`
- **THEN** the result reaches the model unchanged
