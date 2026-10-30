## Purpose

Look up current library docs at the lowest context cost, through Context7 or a tool of our own.

## ADDED Requirements

### Requirement: Lightest Option Wins

The lookup SHALL be the option with the fewest characters of standing context (tool definitions and descriptions) among a light Context7 integration and our own tool, read by `just capture`. The old `find-docs` skill is not restored as it was (D15).

#### Scenario: Choice Recorded

- **WHEN** the lookup ships
- **THEN** `decisions.md` holds the standing size of each option and the pick

### Requirement: Answer with Its Source

A lookup SHALL return the doc text with its library, version, and URL.

#### Scenario: Version Named

- **WHEN** the model looks up a library at a version
- **THEN** the answer names that version and its source
