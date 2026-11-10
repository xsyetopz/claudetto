# version-floor Specification

## Purpose
Keep Claude Code at or above `2.1.316`, the version every check of claudetto runs on.

## Requirements

### Requirement: Setup Writes the Floor

Setup SHALL write `minimumVersion: "2.1.318"` (`MINIMUM_VERSION` in `hooks/setup/settings.ts:16`) in the "Features off" group. Setup SHALL keep a value the user set when the user answers "Fill in only what I have not set", and SHALL overwrite it when the user answers "Replace mine too", whether the value is higher or lower.

#### Scenario: Higher Value Kept

- **WHEN** `minimumVersion` is `2.1.320` and the user answers "Fill in only what I have not set"
- **THEN** setup leaves it

#### Scenario: Replace Mine Too

- **WHEN** `minimumVersion` is `2.1.320` and the user answers "Replace mine too"
- **THEN** setup writes `2.1.318`

#### Scenario: Same Floor in Both Places

- **WHEN** setup writes the file
- **THEN** the written `minimumVersion` equals the version the startup warning checks (`setup.test.ts`, "setup writes the same minimumVersion that the startup floor warns on")

### Requirement: Warn Once at Start

At `SessionStart` with `source` `startup`, the mod SHALL log one line to the user with `$.ui.log`, naming the required and the running version and telling the user to run `claude update`, when the running version is older than `2.1.318`, and nothing otherwise. The line reaches the user and not the model. A `resume` SHALL log nothing.

#### Scenario: Older Version

- **WHEN** Claude Code `2.1.317` starts a session
- **THEN** one line is logged, once per session (`setup.test.ts`, "a startup below the version floor logs exactly one line, naming both versions")

#### Scenario: Current Version

- **WHEN** Claude Code `2.1.318` or later starts a session
- **THEN** no text is logged (`setup.test.ts`, "the floor itself logs nothing about the version")

#### Scenario: Resume

- **WHEN** a session resumes
- **THEN** no version line is logged (`setup.test.ts`, "a resume logs neither the notice nor the version")
