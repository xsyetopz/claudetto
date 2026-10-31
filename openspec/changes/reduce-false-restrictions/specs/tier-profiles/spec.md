## REMOVED Requirements

### Requirement: Setup Asks What to Keep

**Reason**: The fixed `$.ui.ask` dialog takes no more than 4 groups, has no place for the sandbox toggles, and cannot see what the user's settings already hold. The user, 2026-10-31: "remove the setup's ui.ask bits. let the model do the setup for the user by looking around and seeing the differences needed, and them prompt via AskUserQuestions".

**Migration**: `Setup Asks about Each Difference` replaces it. `/claudetto:setup` keeps its name.

## ADDED Requirements

### Requirement: Setup Asks about Each Difference

Setup SHALL run from inside Claude Code with no checkout of this repository, no `bun`, and no `just`. The model SHALL read a diff between the claudetto snippet and the user's settings from the `mcp__claudetto__setup` tool, SHALL ask the user about each difference with `AskUserQuestion`, and SHALL write only the keys the user keeps, through the same tool. Setup uses model tokens.

#### Scenario: Only Differences Are Asked

- **WHEN** `/claudetto:setup` runs and the user's settings already hold some snippet keys with the same values
- **THEN** the model asks about no key that the diff does not show

#### Scenario: Sandbox Toggles

- **WHEN** the diff holds `sandbox` keys
- **THEN** the model asks about them in a question of their own, and no limit of 4 groups applies to the whole setup

#### Scenario: A Fact of This Repository Is Not Shipped

- **WHEN** a value would carry a reading of this repository rather than a value true of any machine
- **THEN** the snippet SHALL NOT hold it, because the tool gives the snippet to every user
- **AND** `autoMode` SHALL hold the claudetto suite of `plugins/claudetto/src/automode/rules.ts`, whose `environment` list names no fact of one repository

#### Scenario: A Discarded Difference

- **WHEN** the user keeps some differences and not others
- **THEN** no discarded key is written, and a key the user already holds stays as it is

#### Scenario: Nobody to Ask

- **WHEN** no one answers `AskUserQuestion`, as in a `claude -p` run
- **THEN** nothing is written and the report says so

#### Scenario: The Write Stays in Code

- **WHEN** the model writes the kept keys
- **THEN** it calls `mcp__claudetto__setup`, which merges them with `applyTier`, and the model does not edit the settings file itself

#### Scenario: Cost of the Command

- **WHEN** the change is archived
- **THEN** `design.md` gives the characters that a setup run adds, measured with `just capture --arm plugin --shipped`

#### Scenario: A Settings Hook Is Not the Mechanism

- **WHEN** a `settings.read` hook answers the keys in place of a settings file
- **THEN** the readers that build the first request do not take the answer: `just capture --arm plugin` read 61,353 characters and 12 tool schemas with the hook and no file, against 31,861 and 9 with the file, and the engine logged `an answer without deniedMcpServers: unset for the reader`
- **AND** a real settings file SHALL be the mechanism, because a plugin's own `settings` key reaches only `agent` and `subagentStatusLine`
