## ADDED Requirements

### Requirement: The Snippet Holds the Planned Keys

The snippet SHALL hold `$schema`, `minimumVersion: "2.1.314"`, `workflowSizeGuideline: "unrestricted"`, `workflowKeywordTriggerEnabled: false`, `enableWorkflows: false`, `enableArtifact: false`, `remoteControlAtStartup: false`, `statusLine`, and `subagentStatusLine`, and setup SHALL write only `~/.claude/settings.json`.

#### Scenario: Clean Write

- **WHEN** setup writes to an empty settings file
- **THEN** `jq` reads each key above with its value, and `~/.claude.json` is unchanged

### Requirement: The Haiku Summary Runs at High

The compaction summary call on Haiku 5.5 SHALL use effort `high`, apart from the tier row's `effort`, which stays the main session's `effortLevel` (D16).

#### Scenario: Summary Call

- **WHEN** `session.compact` is answered by the summary
- **THEN** the call names `claude-haiku-5-5` and effort `high`

## MODIFIED Requirements

### Requirement: Setup Asks What to Keep

Setup SHALL run from inside Claude Code with no checkout of this repository, no `bun`, and no `just`, SHALL ask which groups of keys to keep, and SHALL write no key of a group the user discarded. It SHALL cost the session no model tokens (the user, 2026-10-30: "it will ask what to keep, meaning the rest get discarded, upon lightweight setup command", and "we need least-costly (tokens, characters) approach that *works*").

#### Scenario: The Dialog

- **WHEN** `/claudetto:setup` runs with a person to ask
- **THEN** one `$.ui.ask` dialog offers the groups of `plugins/claudetto/src/tiers/groups.ts`, between two and four of them because `$.ui.ask` accepts no other count, and every key the snippet sets sits in exactly one group

#### Scenario: A Fact of This Repository Is Not Shipped

- **WHEN** a value would carry a reading of this repository rather than a value true of any machine
- **THEN** the snippet SHALL NOT hold it, because the command writes the snippet for every user
- **AND** `autoMode` SHALL hold the claudetto suite of `plugins/claudetto/src/automode/rules.ts`, whose `environment` list names no fact of one repository, and the group "Sandbox and auto mode" SHALL offer it (D39)

#### Scenario: A Discarded Group

- **WHEN** the user keeps some groups and not others
- **THEN** no key of a discarded group is written, and a key of that group the user already holds stays as it is

#### Scenario: Nobody to Ask

- **WHEN** the dialog is dismissed, or there is no one to ask, as in a `claude -p` run
- **THEN** nothing is written and the report says so

#### Scenario: Cost of the Command

- **WHEN** the command answers
- **THEN** it returns `text` and no `context`, so the person reads the report and the model reads nothing of it
- **AND** the only cost is the row in the command listing, measured at 48 characters of the first request by `just capture --arm plugin --shipped` (31,909 against 31,861 with no command)

#### Scenario: A Settings Hook Is Not the Mechanism

- **WHEN** a `settings.read` hook answers the keys in place of a settings file
- **THEN** the readers that build the first request do not take the answer: `just capture --arm plugin` read 61,353 characters and 12 tool schemas with the hook and no file, against 31,861 and 9 with the file, and the engine logged `an answer without deniedMcpServers: unset for the reader`
- **AND** a real settings file SHALL be the mechanism, because a plugin's own `settings` key reaches only `agent` and `subagentStatusLine`
