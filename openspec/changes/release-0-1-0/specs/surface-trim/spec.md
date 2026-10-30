## ADDED Requirements

### Requirement: Setup Writes the Approved `env` Flags

Setup SHALL write the 16 flags of D18 and `CLAUDE_CODE_THRIFTY_SONIC=0` (D14), and the code SHALL mark the last as unofficial with its source (`references.md:396` of the restart change).

#### Scenario: Flags Written

- **WHEN** setup writes to an empty settings file
- **THEN** `env` holds each of the 17 names with its value

### Requirement: Built-in Agents Are Denied

Setup SHALL write `Agent(general-purpose)`, `Agent(Explore)`, `Agent(Plan)`, `Agent(claude)`, `Agent(claude-code-guide)`, and `Agent(statusline-setup)` to `permissions.deny` (D4).

#### Scenario: Agent List

- **WHEN** a session starts after setup
- **THEN** the agent list of the first request names none of the six
