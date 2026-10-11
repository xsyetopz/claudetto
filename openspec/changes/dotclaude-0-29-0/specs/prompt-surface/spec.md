## MODIFIED Requirements

### Requirement: Start-of-session budget

`tools/limits.ts` SHALL hold a bound in tokens for the start-of-session context of a dotclaude session.
`just measure` SHALL print its numbers and compare them with that bound, and SHALL write no file.
The measure SHALL be the input, cache-creation, and cache-read tokens of the first request, from the API usage, for a fixed one-line prompt.
The bound SHALL be set from a capture after the cuts of design D17, plus 5% headroom.

#### Scenario: Budget check

- **WHEN** the budget check runs a headless session with the snippet applied and a fixed one-line prompt
- **THEN** the sum of the usage fields of the first request is at or below the bound

#### Scenario: Over budget

- **WHEN** the sum is above the bound
- **THEN** the check fails and shows the sum, the bound, and the difference

### Requirement: Tool descriptions cut by id

The mod SHALL trim the description of each built-in tool to its definition only through `tool.describe`, by exact tool name, and only where the shorter text keeps the behavior in the eval suite (design D17).
A trimmed description SHALL NOT be longer than the vanilla description of the same tool.
The mod MAY set `isDeferred` to `true` only for a tool that a capture shows the engine defers with a token saving, and SHALL NOT set it to `false`.

#### Scenario: Bash description

- **WHEN** a capture compares the `Bash` description with the snippet and without it
- **THEN** the description with the snippet is shorter

#### Scenario: Deferral

- **WHEN** the mod gets a tool that the capture lists as deferrable
- **THEN** it sets `isDeferred` to `true`, and a tool outside that list keeps its state

#### Scenario: Unknown tool

- **WHEN** the mod gets a tool name that it does not know
- **THEN** it passes the event on with no change
