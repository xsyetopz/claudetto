# commands Specification

## Purpose

Defines the entries that dotclaude adds to Claude Code, who can invoke each one, and the check that finds drift from the profile, with the least context cost and the least manual work.

## Requirements

### Requirement: User invokes only what needs consent

An entry that writes user configuration SHALL be user-invoked only.
Each other entry SHALL be model-invocable, so that Claude can move the work forward without the user.

#### Scenario: Setup

- **WHEN** the model tries to invoke the setup entry with the Skill tool
- **THEN** Claude Code refuses the call

#### Scenario: Handoff

- **WHEN** the context is near the window and the work is not done
- **THEN** Claude can invoke the handoff entry itself

### Requirement: Small listing

Each model-invocable dotclaude entry SHALL be `name-only` in `skillOverrides`, or have a description of 100 characters or fewer.
A user-invoked entry SHALL have no skill-listing entry.

#### Scenario: Listing cost

- **WHEN** a session starts with dotclaude
- **THEN** `/context` shows the dotclaude entries at their name or short description only

### Requirement: Setup

dotclaude SHALL give a setup entry that applies the profile, as the `settings-profile` capability defines.

#### Scenario: Run setup

- **WHEN** the user runs the setup entry
- **THEN** setup shows the diff and asks before it writes

### Requirement: Handoff

dotclaude SHALL give a handoff entry that writes a note which primes a new session after `/clear`, and lists the notes.
It SHALL remove a note only after the user confirms.

#### Scenario: Write a note

- **WHEN** the handoff entry runs with a slug
- **THEN** a note exists at `.claude/handoffs/<slug>.md`

### Requirement: Drift check

At session start, dotclaude SHALL compare the active settings with the profile.
It SHALL add text to the context only when it finds a difference.
Examples are a built-in plugin that is on again, a synced skill in the listing, and a mod that the installed Claude Code version does not support.

#### Scenario: No drift

- **WHEN** the active settings match the profile
- **THEN** the check adds no text

#### Scenario: Plugin on again

- **WHEN** a Claude Code update turns on a built-in plugin that the profile turns off
- **THEN** the check names the plugin and the setting that turns it off, in one line

### Requirement: Script before model

An entry whose work is a fixed procedure SHALL do that work in a script.
It SHALL give the model only the result and the decisions that the user must make.

#### Scenario: Setup output

- **WHEN** setup runs
- **THEN** a script makes the diff, and the model does not read the settings files itself

### Requirement: No third-party skills

dotclaude SHALL NOT ship skills that come from other authors or from other repositories of the same author.

#### Scenario: Plugin contents

- **WHEN** a test lists the skills of the plugin
- **THEN** each one is a dotclaude part
