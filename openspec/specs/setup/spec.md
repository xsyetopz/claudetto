# setup Specification

## Purpose
`/claudetto:setup` writes the claudetto settings into a settings file, removes what an older claudetto wrote, and keeps each key of the user.

## Requirements

### Requirement: Merge Keeps User Keys

Setup SHALL merge the snippet into the chosen settings file and keep each key and rule of the user that the snippet does not own.

#### Scenario: User Allow Rule

- **WHEN** the user settings have `permissions.allow: ["Bash(make *)"]` and setup runs
- **THEN** the file still has `Bash(make *)`

### Requirement: Remove Keys of 0.2.0

Setup SHALL remove each key and rule that claudetto 0.2.0 wrote and 0.3.0 drops: the 170 `ask` rules, the `sandbox` keys, the auto-mode keys, `CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT`, and the other keys of the drop list in `settings-levers`.
It SHALL report each removed key.

#### Scenario: Upgrade from 0.2.0

- **WHEN** setup runs on a settings file that the 0.2.0 setup wrote
- **THEN** the file has no `Bash(rm -r*)` rule and no `sandbox.enabled`
- **AND** setup lists the removed keys

### Requirement: Plan Tier

Setup SHALL read the plan of the login and write the subagent cap of `agent-roster` for it.
When it cannot read the plan, it SHALL write no cap and say so.

#### Scenario: Unknown Tier

- **WHEN** `~/.claude.json` has no tier that setup knows
- **THEN** setup writes no cap and names the tier that it found

### Requirement: No Code-Intelligence Offer

Setup SHALL NOT offer or run `codegraph install` or another code-intelligence installer.

#### Scenario: Setup Run

- **WHEN** setup runs in a project of any language
- **THEN** it offers no code-intelligence tool, and it writes no `UserPromptSubmit` hook
