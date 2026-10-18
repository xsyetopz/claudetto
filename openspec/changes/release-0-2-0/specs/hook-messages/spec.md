# Spec Delta: `hook-messages`

## Purpose

The text that the hooks show to the user.

## ADDED Requirements

### Requirement: One-Line Notices

The system SHALL send each `$.ui.log` text as one line with no line break.

#### Scenario: A Multi-Line Reason

- **WHEN** a hook logs a notice whose reason has several lines
- **THEN** the logged text has no `\n` and has `claudetto` at most once
