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
