## MODIFIED Requirements

### Requirement: MCP Description Bound

The snippet SHALL set `CLAUDE_CODE_MAX_MCP_DESCRIPTION_LENGTH` to a value from the bounds file of the `setup` module.

#### Scenario: Bound Value

- **WHEN** setup writes the snippet
- **THEN** the env var equals the bound in the bounds file of the `setup` module

### Requirement: Snippet from the Matrix

The snippet SHALL write the `Lever` of each row of `research/replace-matrix.md` with the decision `disable` or `replace and disable`, and SHALL write no key that no row and no decision of `design.md` names.
The decisions of change `release-0-3-0-alpha-2` count as decisions of `design.md`.
A lint test SHALL fail on each key of the snippet that the settings schema does not have, and name the key.

#### Scenario: Extra Key

- **WHEN** a JSON block of the snippet holds a key that the settings schema does not have
- **THEN** the lint test fails and names the key
