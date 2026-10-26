## MODIFIED Requirements

### Requirement: Notices Report a Change

Each notice that claudetto shows to the user SHALL report a change that claudetto made, or ask for an action.
A count in a notice SHALL agree in number with its noun.

#### Scenario: Removed Folders

- **WHEN** cleanup removes 1 folder of 2 MB
- **THEN** the notice says "removed 1 folder" with the size

#### Scenario: Two Folders

- **WHEN** cleanup removes 2 folders and 1 file
- **THEN** the notice says "2 folders" and "1 file"

#### Scenario: Nothing Removed

- **WHEN** cleanup removes nothing
- **THEN** the session shows no cleanup notice

#### Scenario: Handoff Path

- **WHEN** a handoff file is written
- **THEN** the notice gives the path relative to the project
