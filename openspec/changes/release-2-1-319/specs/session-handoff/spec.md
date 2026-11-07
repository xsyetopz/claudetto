## MODIFIED Requirements

### Requirement: Handoff before a Clear

The system SHALL write a handoff file when the agent calls the handoff tool, before the plugin clears the session. A `/clear` the person types SHALL write no file for a read-back. When the user has set a `/goal` and not cleared it, the system SHALL run `/goal <condition>` after the plugin's clear and before it sends the read-back.

#### Scenario: Typed Clear after a Short Session

- **WHEN** the user types `/clear` in a session that has no earlier handoff
- **THEN** the next session injects no handoff text

#### Scenario: Clear with Nothing to Keep

- **WHEN** the session has no user turn
- **THEN** no file is written and no error is shown

#### Scenario: A Goal Survives the Handoff

- **WHEN** the user ran `/goal all tests pass` and the agent then calls the handoff tool
- **THEN** the plugin runs `/clear`, then `/goal all tests pass`, then sends the read-back

#### Scenario: A Cleared Goal Stays Cleared

- **WHEN** the user ran `/goal all tests pass`, then `/goal clear`, and the agent calls the handoff tool
- **THEN** the plugin runs `/clear` and no `/goal`

#### Scenario: A Goal the Engine Refuses

- **WHEN** the `/goal` after the clear is refused
- **THEN** one line names the goal and the cause, and the read-back is still sent
