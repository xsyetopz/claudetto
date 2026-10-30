## Purpose

The `Hermes` agent does web research in its own context and hands back a compact, sourced result.

## ADDED Requirements

### Requirement: Web Research Only

`Hermes` SHALL have only web and read tools, and SHALL return each finding with its URL and the quoted line.

#### Scenario: Research Task

- **WHEN** the main thread asks `Hermes` a question about a library
- **THEN** the reply names each source URL and quotes it, and no page text beyond the quotes

### Requirement: Small Description

The agent description SHALL fit the `prompt-footprint` budget for an agent line.

#### Scenario: Size

- **WHEN** `just inventory` reads the agent list
- **THEN** the `Hermes` line is within its budget
