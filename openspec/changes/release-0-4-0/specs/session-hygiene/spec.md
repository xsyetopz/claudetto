## MODIFIED Requirements

### Requirement: No Request Growth

Hygiene SHALL add no model call, tool, command, skill, or prompt text. The prompt bytes that `just prompt-bytes` prints from fixed inputs SHALL read the same totals before and after a hygiene change.

#### Scenario: Capture After a Change

- **WHEN** `just prompt-bytes` runs after a hygiene change
- **THEN** its totals equal the readings taken before it
