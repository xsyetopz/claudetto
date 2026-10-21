# hook-messages Specification

## Purpose

The text that the hooks of the plugins show to the user through the log of the engine.

## Requirements

### Requirement: One-Line Notices

The system SHALL send each `$.ui.log` text as one line with no line break.

#### Scenario: A Multi-Line Reason

- **WHEN** a hook logs a notice whose reason has several lines
- **THEN** the logged text has no `\n` and has `claudetto` at most once
