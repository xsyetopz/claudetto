# settings-levers Specification

## Purpose
The claudetto snippet writes each settings key and env var that has a measured saving or a decision of the plan, and no other key.

## Requirements

### Requirement: Snippet from the Matrix

The snippet SHALL write the `Lever` of each row of `research/replace-matrix.md` with the decision `disable` or `replace and disable`, and SHALL write no key that no row and no decision of `design.md` names.

#### Scenario: Extra Key

- **WHEN** a change adds a key to the snippet that no row of the matrix and no decision names
- **THEN** a test fails and names the key

### Requirement: Pinned Effect

Each key and env var of the snippet SHALL have a test that pins its effect on a stub capture or on a file that Claude Code writes, so that a change in a later Claude Code fails the test.
A lever whose effect no stub run shows, because it needs a claude.ai login, an IDE, a server flag, or many sessions, SHALL have a written reason in the test and a pin that the bundle of the installed Claude Code still reads its name.

#### Scenario: Lever Stops Working

- **WHEN** a later Claude Code ignores `CLAUDE_CODE_DISABLE_CRON=1`
- **THEN** the pin test fails, because the `init` message of the stub run lists `CronCreate`

#### Scenario: Lever with No Stub Effect

- **WHEN** a later Claude Code no longer reads `CLAUDE_CODE_TOTAL_TOKENS_REMINDER`
- **THEN** the pin test fails, because the bundle has no such name

### Requirement: No Lost Capability

The snippet SHALL NOT write a key that turns off a capability that the plan needs, even with a saving: `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS`, `CLAUDE_CODE_DISABLE_ATTACHMENTS`, and `CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT`.

#### Scenario: Background Command

- **WHEN** a session with the snippet runs a command with `run_in_background: true`
- **THEN** the command runs in the background

### Requirement: Keys That Go

The snippet SHALL NOT write `sandbox`, `autoMode`, an `ask` rule, or `bashOutputMaxChars`.
It SHALL set `permissions.disableAutoMode` to `disable` and `permissions.defaultMode` to `default` (design D5).

#### Scenario: Auto Mode Nag

- **WHEN** a person gets a permission prompt in a session with the snippet
- **THEN** the dialog has no row "Yes, and switch to auto mode" and no auto mode tip
