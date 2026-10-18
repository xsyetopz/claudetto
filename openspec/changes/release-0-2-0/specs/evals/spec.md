# Spec Delta: `evals`

## Purpose

The rules that make an eval a proof of a claim.

## ADDED Requirements

### Requirement: A cited eval is a proof

The system SHALL accept an eval as the source of a claim only when it has a run with the plugin and a run without it, at least 10 runs for each, and a check of a file, an exit status, or a tool call.

#### Scenario: A word check

- **WHEN** `just validate` reads an eval case whose only check matches words in the reply
- **THEN** it fails and names the case

#### Scenario: A small sample

- **WHEN** a wiki page cites an eval result with fewer than 10 runs in an arm
- **THEN** `just validate` fails and names the page
