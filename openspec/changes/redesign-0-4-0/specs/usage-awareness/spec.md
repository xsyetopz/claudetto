## MODIFIED Requirements

### Requirement: Usage Line

The `session` module SHALL add one context line with the 5-hour and weekly shares when the band of either share changes, from the `session.measure` event.
The bands SHALL be green below 40%, amber from 40% to 80%, and red above 80%, from the bounds file of the `session` module, the same bounds as the status line.
It SHALL add no line when no band changes, and none for an API key.

#### Scenario: Band Change

- **WHEN** `session.measure` moves the 5-hour share from 39% to 41%
- **THEN** the next request holds one usage line that names amber and both shares

#### Scenario: Same Band

- **WHEN** `session.measure` moves the 5-hour share from 41% to 42%
- **THEN** the next request holds no usage line

#### Scenario: API Key

- **WHEN** the session has no `rate_limits`
- **THEN** no request holds a usage line
