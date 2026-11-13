## ADDED Requirements

### Requirement: Each Plugin Declares the Floor in Its Manifest

Each `plugin.json` that claudetto ships SHALL set `engines["claude-code"]` to `">=2.1.323"`, because Claude Code refuses an install from a git or remote source below the range. A local-folder or `--plugin-dir` install below the range SHALL load with Claude Code's note, which is what a developer checkout wants.

#### Scenario: A Git Install on an Older Claude Code

- **WHEN** a user on Claude Code `2.1.322` installs claudetto from its git marketplace
- **THEN** Claude Code refuses the install and tells the user to run `claude update`

#### Scenario: The Manifests

- **WHEN** a reader reads each `plugin.json` under `plugins/`
- **THEN** each holds `"engines": { "claude-code": ">=2.1.323" }`

### Requirement: No Runtime Version Check

Claudetto SHALL hold no hook or mod that checks the running Claude Code version, because the `engines` range is the one place the floor lives.

#### Scenario: An Older Local Install

- **WHEN** a local-folder install of claudetto starts on Claude Code `2.1.317`
- **THEN** no claudetto hook logs a version line, and the user sees only Claude Code's note

## MODIFIED Requirements

### Requirement: Setup Writes the Floor

Setup SHALL write `minimumVersion: "2.1.323"` (`MINIMUM_VERSION` in `hooks/command.run/useSetup/settings.ts`) in the "Features off" group. Setup SHALL keep a value the user set when the user answers "Fill in only what I have not set", and SHALL overwrite it when the user answers "Replace mine too", whether the value is higher or lower.

#### Scenario: Higher Value Kept

- **WHEN** `minimumVersion` is `2.1.330` and the user answers "Fill in only what I have not set"
- **THEN** setup leaves it

#### Scenario: Replace Mine Too

- **WHEN** `minimumVersion` is `2.1.330` and the user answers "Replace mine too"
- **THEN** setup writes `2.1.323`

#### Scenario: Same Floor in Both Places

- **WHEN** setup writes the file
- **THEN** the written `minimumVersion` equals the lower bound of `engines["claude-code"]` in `plugin.json`

## REMOVED Requirements

### Requirement: Warn Once at Start

**Reason**: The floor comes from `engines["claude-code"]` in each `plugin.json`, which Claude Code enforces for marketplace installs, so every runtime version check goes.
**Migration**: See "Each Plugin Declares the Floor in Its Manifest" in this capability. A user below the floor runs `claude update`.
