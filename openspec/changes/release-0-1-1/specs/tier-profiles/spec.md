# Spec Delta

## ADDED Requirements

### Requirement: A Tool Result Does Not Carry a Haiku Request Past the Price Step

A tool result SHALL be withheld when it would take the next request of a Haiku 5.5 loop over 100,000 prompt tokens, since the handoff trigger is checked between calls (`docs/window-weights.md`). The loop's prompt SHALL be read from the `usage` of its last `turn.step`, and the result's size estimated from its text. A loop on any other model SHALL be left alone.

#### Scenario: Result Would Cross the Step

- **WHEN** a loop whose last step was answered by `claude-haiku-5-5` gets a tool result, and that step's prompt and output tokens plus the result's estimated tokens exceed 100,000
- **THEN** the model reads a withheld result that names its estimated size, the 100,000 step, and how to ask for less, and no request carries the result

#### Scenario: Result Fits

- **WHEN** the same sum is 100,000 or less
- **THEN** the result reaches the model unchanged

#### Scenario: Other Model

- **WHEN** the loop's last step was answered by a model that is not Haiku 5.5
- **THEN** the result reaches the model unchanged, whatever its size
