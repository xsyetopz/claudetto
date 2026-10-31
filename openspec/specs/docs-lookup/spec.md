# docs-lookup Specification

## Purpose
Look up current library docs at the lowest context cost, through the Context7 CLI.

## Requirements

### Requirement: Lightest Option Wins

The lookup SHALL run the Context7 CLI `ctx7`, never the Context7 MCP server, and its standing context SHALL stay below the server's, as read by `just capture`. The old `find-docs` skill is not restored as it was (D15, D35).

#### Scenario: Choice Recorded

- **WHEN** the lookup ships
- **THEN** `decisions.md` holds the standing size of each option and the pick

### Requirement: Answer with Its Source

A lookup SHALL return the doc text with its library, version, and URL.

#### Scenario: Version Named

- **WHEN** the model looks up a library at a version
- **THEN** the answer names that version and its source
