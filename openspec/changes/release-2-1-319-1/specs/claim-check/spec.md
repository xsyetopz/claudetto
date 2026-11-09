## ADDED Requirements

### Requirement: A Popup Answer Is the Person's Words

The `credited` fault SHALL count each answer the person gave through `AskUserQuestion` or `mcp__claudetto__ask-user-question` in this session as the person's words, next to their typed messages.

#### Scenario: Credit to a Popup Choice

- **WHEN** the person picked "feat/2.1.319+1" in the popup and the reply says "as you chose, the branch is `feat/2.1.319+1`"
- **THEN** `credited` does not block

#### Scenario: Credit with No Source

- **WHEN** neither a typed message nor a popup answer holds the choice the reply credits to the person
- **THEN** `credited` blocks once, as before
