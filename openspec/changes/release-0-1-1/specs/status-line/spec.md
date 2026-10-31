# Spec Delta

## ADDED Requirements

### Requirement: `/statusline` Is Answered Without a Model Call

The built-in `/statusline` with no arguments SHALL write claudetto's `statusLine` and `subagentStatusLine` to the user settings file and print a report of what it wrote. It SHALL make no model call and add nothing to the context. A line the user already set SHALL be kept, and the report SHALL say it was kept.

#### Scenario: No Line Set

- **WHEN** the user runs `/statusline` and the settings file has no `statusLine`
- **THEN** both keys are written with claudetto's command, the report names the file, and no model request is sent

#### Scenario: User Line Kept

- **WHEN** the user runs `/statusline` and the settings file has a `statusLine` that is not claudetto's
- **THEN** that value is unchanged, and the report says it was kept

#### Scenario: Unreadable Settings

- **WHEN** the settings file is not a JSON object
- **THEN** nothing is written, and the report names the file to fix

### Requirement: `/statusline` With Arguments

`/statusline <text>` SHALL run the built-in command when the settings do not deny `Agent(statusline-setup)`. When they deny it, claudetto SHALL answer with no model call, saying the built-in agent is denied and naming the rule to remove.

#### Scenario: Agent Denied

- **WHEN** the user runs `/statusline show the time` and `permissions.deny` holds `Agent(statusline-setup)`
- **THEN** no model request is sent, and the answer names `Agent(statusline-setup)` in `permissions.deny`

#### Scenario: Agent Allowed

- **WHEN** the user runs `/statusline show the time` and nothing denies `Agent(statusline-setup)`
- **THEN** the built-in command runs
