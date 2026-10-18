# Spec Delta: `hook-messages`

## Purpose

The text that the hooks show to the user.

## ADDED Requirements

### Requirement: One-line notices

The system SHALL send each `$.ui.log` text as one line with no line break.

#### Scenario: The cap notice of the turn gate

- **WHEN** the turn gate allows a stop after `MAX_BLOCKS` blocks, with a multi-line reason
- **THEN** the logged text has no `\n` and has `claudetto` at most once
