# version-floor Specification

## Purpose
Keep Claude Code at or above `2.1.316`, the version every check of claudetto runs on.

## Requirements

### Requirement: Setup Writes the Floor

Setup SHALL write `minimumVersion: "2.1.316"` (`configure/settings/core.md:47`), and keep a higher value the user set.

#### Scenario: Higher Value Kept

- **WHEN** `minimumVersion` is `2.1.320`
- **THEN** setup leaves it

### Requirement: Warn Once at Start

At `SessionStart` with `source` `startup`, the mod SHALL add one line naming the running and the required version when the running version is older than `2.1.316`, and nothing otherwise.

#### Scenario: Older Version

- **WHEN** Claude Code `2.1.315` starts a session
- **THEN** one warning line is added, once per session

#### Scenario: Current Version

- **WHEN** Claude Code `2.1.316` or later starts a session
- **THEN** no text is added
