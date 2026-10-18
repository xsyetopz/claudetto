# Spec Delta: `hook-messages`

## Purpose

The text that the hooks show to the user.

> `trim-0-2-0` removes the turn gate, so the scenario "The cap notice of the turn gate" does not apply.

## ADDED Requirements

### Requirement: One-Line Notices

The system SHALL send each `$.ui.log` text as one line with no line break.

#### Scenario: The Cap Notice of the Turn Gate

- **WHEN** the turn gate allows a stop after `MAX_BLOCKS` blocks, with a multi-line reason
- **THEN** the logged text has no `\n` and has `claudetto` at most once
