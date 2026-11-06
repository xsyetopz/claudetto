## MODIFIED Requirements

### Requirement: Setup Writes Both Lines

Setup SHALL write `statusLine` as a command at the plugin root with `refreshInterval` 5, and keep a value the user set whole. `subagentStatusLine` SHALL ship in the plugin's root `settings.json`, and setup SHALL NOT write it.

#### Scenario: User Line Kept

- **WHEN** `statusLine` is already set to another command
- **THEN** setup keeps it and the report says so

#### Scenario: Subagent Line from the Plugin

- **WHEN** the plugin is enabled
- **THEN** `subagentStatusLine` comes from the plugin's root `settings.json` and no setup step writes it

### Requirement: `/statusline` Is Answered Without a Model Call

The built-in `/statusline` with no arguments SHALL write claudetto's `statusLine` to the user settings file and print a report of what it wrote. It SHALL make no model call and add nothing to the context. A line the user already set SHALL be kept, and the report SHALL say it was kept.

#### Scenario: No Line Set

- **WHEN** the user runs `/statusline` and the settings file has no `statusLine`
- **THEN** the key is written with claudetto's command, the report names the file, and no model request is sent

#### Scenario: User Line Kept

- **WHEN** the user runs `/statusline` and the settings file has a `statusLine` that is not claudetto's
- **THEN** that value is unchanged, and the report says it was kept

#### Scenario: Unreadable Settings

- **WHEN** the settings file is not a JSON object
- **THEN** nothing is written, and the report names the file to fix

## REMOVED Requirements

### Requirement: `/statusline` With Arguments

**Reason**: The call no longer passes through to the built-in command, and no denial text is answered, because `agent.offer` withholds the built-in `statusline-setup` agent (`feature-map.md`, row "`/statusline`"; `tasks.md` 5.26).
**Migration**: See "`/statusline` With Text Uses an Edit Text" in this capability.

## ADDED Requirements

### Requirement: `/statusline` With Text Uses an Edit Text

`/statusline <text>` SHALL replace the built-in command's prompt, through `skill.prompt`, with claudetto's edit text, so the main model edits the setting under the stock grant. It SHALL NOT pass the call through to the built-in command, and it SHALL NOT answer with a denial text.

#### Scenario: Text Given

- **WHEN** the user runs `/statusline show the time`
- **THEN** the main model receives the edit text in place of the built-in prompt

#### Scenario: The Built-in Agent Is Withheld

- **WHEN** the built-in `statusline-setup` agent is withheld by `agent.offer`
- **THEN** `/statusline <text>` still works, and no answer names `Agent(statusline-setup)` in `permissions.deny`
