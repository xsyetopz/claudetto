## MODIFIED Requirements

### Requirement: Goal Stop Cap

The `/goal` stop SHALL block a stop at most a bound number of times in a row, from the bounds file of the `work` module, and then let the stop go with a note to the user.

#### Scenario: Stuck Goal

- **WHEN** the stop check fails more times in a row than the bound
- **THEN** the session stops, and the note names the goal and the count
