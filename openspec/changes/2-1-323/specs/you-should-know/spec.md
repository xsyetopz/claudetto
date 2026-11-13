## ADDED Requirements

### Requirement: A Popup Answer Closes the Note

When the person answers an `AskUserQuestion` call while this turn's offer is open, and the call ends with no deny and no error, the observer MUST close the offer as one the person knows, so the next call runs.

#### Scenario: The Person Answers a Popup

- **WHEN** this turn's offer is open, and the person answers an `AskUserQuestion` call
- **THEN** the offer closes, and the next `Bash` call runs with no new request
