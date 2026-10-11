# commands Specification

## Purpose

Defines the entries that dotclaude adds to Claude Code, who can invoke each one, and the check that finds drift from the tested setup, with the least context cost and the least manual work.
dotclaude adds no entry that writes a Claude Code setting or a dotclaude file (design D35).

## Requirements

### Requirement: User invokes only what needs consent

An entry that changes tool configuration SHALL be user-invoked only.
Each other entry SHALL be model-invocable, so that Claude can move the work forward without the user.

#### Scenario: Setup

- **WHEN** the model tries to invoke the setup entry with the Skill tool
- **THEN** Claude Code refuses the call

### Requirement: Small listing

Each model-invocable dotclaude entry SHALL be `name-only` in `skillOverrides`, or have a description of 100 characters or fewer.
A user-invoked entry SHALL have no skill-listing entry.

#### Scenario: Listing cost

- **WHEN** a session starts with dotclaude
- **THEN** `/context` shows the dotclaude entries at their name or short description only

### Requirement: Setup

dotclaude SHALL give a setup entry that runs only the OpenSpec configuration step (the `openspec-integration` capability).
The setup entry SHALL NOT write a Claude Code setting, a backup, a launcher stub, or a block in `CLAUDE.md`.

#### Scenario: Run setup

- **WHEN** the user runs the setup entry
- **THEN** setup asks before it runs an OpenSpec command that writes files
- **AND** it changes no Claude Code settings file

### Requirement: No handoff entry

dotclaude SHALL NOT give a handoff entry and SHALL NOT write `.claude/handoffs/<slug>.md`.
The checkboxes of `tasks.md` and the commits hold the state of the work.

#### Scenario: Skill list

- **WHEN** a test lists the skills of the plugin
- **THEN** it finds no `handoff` skill

### Requirement: Drift check

At session start, dotclaude SHALL compare the active Claude Code state with constants in code.
It SHALL add text to the context only when it finds a difference.
Examples are a built-in plugin that is on, a synced skill in the listing, a mod prompt section that the installed Claude Code version does not list, a Claude Code version other than the tested version, and a seated guard.
The check SHALL read no profile file and SHALL write no file.

#### Scenario: No drift

- **WHEN** the active state matches the constants
- **THEN** the check adds no text

#### Scenario: Plugin on again

- **WHEN** a Claude Code update turns on a built-in plugin that the tested setup has off
- **THEN** the check names the plugin and the setting that turns it off, in one line

### Requirement: Script before model

An entry whose work is a fixed procedure SHALL do that work in a script.
It SHALL give the model only the result and the decisions that the user must make.

#### Scenario: Setup output

- **WHEN** setup runs
- **THEN** a script runs the OpenSpec commands, and the model does not read the settings files itself

### Requirement: No third-party skills

dotclaude SHALL NOT ship skills that come from other authors or from other repositories of the same author.

#### Scenario: Plugin contents

- **WHEN** a test lists the skills of the plugin
- **THEN** each one is a dotclaude part
