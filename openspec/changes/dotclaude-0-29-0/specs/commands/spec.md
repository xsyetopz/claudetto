## ADDED Requirements

### Requirement: Configure

dotclaude SHALL give a `configure` entry that the user invokes after install (design D13).
It SHALL set up the global `~/.claude`, the repository `.claude`, and the outside tools.
A script SHALL compute each change, and `configure` SHALL show the diff of each file and write that file only after the user confirms the diff.
It SHALL write no backup file.

#### Scenario: Run configure

- **WHEN** the user runs `configure` and confirms the diff of `~/.claude/settings.json` only
- **THEN** `configure` writes `~/.claude/settings.json` and no other file

#### Scenario: Model call

- **WHEN** the model tries to invoke `configure` with the `Skill` tool
- **THEN** Claude Code refuses the call

### Requirement: Renamed skills

Each dotclaude skill SHALL have the name of its 0.29.0 roster, and the CHANGELOG SHALL list each old name with its new name.

#### Scenario: Old name

- **WHEN** a test lists the skills of the plugins
- **THEN** no skill has the old name `setup`

### Requirement: Handoff and goal entries

dotclaude SHALL give a handoff entry (`handoff` capability) and a goal entry (`goal` capability).

#### Scenario: Skill list

- **WHEN** a test lists the skills of the plugin
- **THEN** it finds the handoff entry and the goal entry

## REMOVED Requirements

### Requirement: Setup

**Reason**: `configure` replaces `setup`, and it also sets up the Claude Code settings after a confirmed diff (design D13).
**Migration**: Run `configure` in place of `setup`.

### Requirement: No handoff entry

**Reason**: The handoff replaces compaction (design D19).
**Migration**: "Handoff and goal entries" and the `handoff` capability replace it.
