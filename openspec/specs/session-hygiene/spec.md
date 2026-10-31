# session-hygiene Specification

## Purpose
Remove stale files that claudetto and Claude Code leave under `~/.claude/` and in the project.

## Requirements

### Requirement: Stale Claudetto Files Go

Hygiene SHALL remove claudetto's own work files past their age limit, such as old handoffs, and keep the newest handoff of each project.

#### Scenario: Old Handoffs

- **WHEN** a project holds handoffs older than the limit and one newer
- **THEN** the old ones are removed and the newest stays

### Requirement: Stale Generated Files Go

Hygiene SHALL remove stale files that programs generate under `~/.claude/`, by a list of paths and age limits in code, each with its source. It SHALL NOT touch a settings file, a credentials file, `CLAUDE.md`, a skill, an agent, a plugin install, or a transcript newer than its limit (D11).

#### Scenario: Listed Path

- **WHEN** a listed path holds a file past its limit
- **THEN** the file is removed and counted in the report

#### Scenario: Unlisted Path

- **WHEN** a file is under a path that is not listed
- **THEN** it is left

### Requirement: Dry Run First

Hygiene SHALL print what it would remove with `--dry-run`, and the automatic run SHALL never block a session start.

#### Scenario: Dry Run

- **WHEN** hygiene runs with `--dry-run`
- **THEN** it lists the files and removes none
