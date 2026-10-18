# Spec Delta: `evals`

## Purpose

The rules that make an eval a proof of a claim.

## ADDED Requirements

### Requirement: A Cited Eval Is a Proof

The system SHALL accept an eval as the source of a claim only when it has a run with the plugin and a run without it, at least 10 runs for each, and a check of a file, an exit status, or a tool call.

#### Scenario: A Word Check

- **WHEN** `just validate` reads an eval case whose only check matches words in the reply
- **THEN** it fails and names the case

#### Scenario: A Small Sample

- **WHEN** a wiki page cites an eval result with fewer than 10 runs in an arm
- **THEN** `just validate` fails and names the page
