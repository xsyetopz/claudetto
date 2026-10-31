## Purpose

Setup prepares OpenSpec in the project it runs in, with the stock CLI and no claudetto copy of its workflow.

## ADDED Requirements

### Requirement: Setup Runs `openspec init`

When setup runs in a project and the `openspec` CLI is on `PATH`, setup SHALL run `openspec init --tools claude --profile core` there unless `openspec/` already exists (D27). Claudetto SHALL NOT ship OpenSpec workflow skills, preset sources, or `bin/minispec` (D3).

#### Scenario: CLI Present

- **WHEN** setup runs in a project with no `openspec/` and `openspec` on `PATH`
- **THEN** `openspec/` exists afterwards and the setup report names the command it ran

#### Scenario: CLI Absent

- **WHEN** `openspec` is not on `PATH`
- **THEN** setup writes the settings, skips the init, and the report says the CLI is missing
