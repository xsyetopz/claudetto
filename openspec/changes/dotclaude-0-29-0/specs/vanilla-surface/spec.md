## ADDED Requirements

### Requirement: Built-in inventory

The wiki SHALL list each built-in tool, skill, plugin, and attachment type of the newest supported Claude Code version, with its gate, its start cost, and a decision: keep, defer, or turn off (design D9).
Each decision SHALL have a reason, and each turned-off item SHALL have its switch in the snippet.
An item whose turn-off can cost quality SHALL stay on until an eval shows no loss.

#### Scenario: New built-in tool

- **WHEN** a Claude Code version adds a tool that the inventory does not list
- **THEN** the inventory test fails and names the tool

#### Scenario: Turned-off tool

- **WHEN** the inventory marks `PushNotification` as turned off
- **THEN** the snippet holds the switch for it, and the pin test checks the switch

### Requirement: Tool picks of the user

The snippet SHALL keep the tools on and turn the tools off that `research/issues.md` records as picks of the user (design D9).
The wiki SHALL record each pick.

#### Scenario: Picks in the snippet

- **WHEN** a test reads the snippet
- **THEN** it holds no switch for `EnterPlanMode`, `ExitPlanMode`, or `LSP`
- **AND** it holds a switch for `SendFile`, `SendUserFile`, `SendMessage`, `Projects`, `DesignTool`, `DesignSync`, `SendFeedback`, `NotebookEdit`, `RemoteTrigger`, `ProposeSkills`, `ProposeGoal`, `PushNotification`, and `EndConversation`
- **AND** it holds a switch for the `Task*` tools, cron, and `ScheduleWakeup`

### Requirement: Deny check by capture

A tool that the snippet turns off with `permissions.deny` SHALL leave the request, and a capture SHALL show it.

#### Scenario: Deny removes the tool

- **WHEN** a capture runs with the snippet that denies `EndConversation`
- **THEN** the deferred-tool list of the request has no `EndConversation`

### Requirement: Push notification settings left unset

The snippet SHALL NOT set `inputNeededNotifEnabled` or `agentPushNotifEnabled`.
These keys send push notifications to the devices of the user, their default is off, and the user decides them.

#### Scenario: Snippet

- **WHEN** a test reads the snippet
- **THEN** it has neither key

### Requirement: Claude Code data read as is

dotclaude SHALL read Claude Code data with the shape that the supported version gives, and SHALL hide the dependent part when the shape differs.
dotclaude MAY use undocumented Claude Code data, such as config keys, transcript entries, and cache files, when the research dossier documents its shape from the bundle (design D24).
An extracted schema SHALL name its Claude Code version in a `$comment` keyword.

#### Scenario: Extracted schema

- **WHEN** a test reads `schemas/claude-code-settings.json`
- **THEN** the file names its Claude Code version in a `$comment` keyword and has no `x-claude-code-version` key

#### Scenario: Undocumented Claude Code data

- **WHEN** the status line reads `cachedUsageUtilization` and the shape is not the known shape
- **THEN** the segment is hidden

#### Scenario: Undocumented source in use

- **WHEN** a dotclaude part reads an undocumented Claude Code data source
- **THEN** the research page of the supported version documents the shape of that source and names the part

## REMOVED Requirements

### Requirement: No proprietary format

**Reason**: `research/issues.md` records that the rules of the 0.28.0 design, such as D35, do not bind 0.29.0, and the handoff and the generator need their own files (design D12, D19).
**Migration**: Each new file has a spec in `handoff` or `generator`, and "Claude Code data read as is" keeps the rule for Claude Code data.

### Requirement: Kept items

**Reason**: It lists the exceptions to "No proprietary format", which this change removes.
**Migration**: The scenarios "Extracted schema" and "Undocumented Claude Code data" move to "Claude Code data read as is".
