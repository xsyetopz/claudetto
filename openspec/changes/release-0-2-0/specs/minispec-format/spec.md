# Spec Delta: `minispec-format`

## Purpose

The file format of a MiniSpec change and the config of a repository.

> Closed: `trim-0-2-0` removes `minispec`, so this delta does not apply.

## ADDED Requirements

### Requirement: Frontmatter in Each Change File

The system SHALL write and require YAML frontmatter in `proposal.md` and `tasks.md` of each change.

#### Scenario: A New Change

- **WHEN** `minispec new add-export --tier medium` runs
- **THEN** `proposal.md` starts with frontmatter that has `name: add-export` and `tier: medium`

#### Scenario: No Frontmatter

- **WHEN** `minispec validate` reads a `proposal.md` with no frontmatter
- **THEN** it exits with a status other than 0 and names the file

### Requirement: Repository Config

The system SHALL read `.minispec.yml` or `.minispec.yaml` at the repository root, and refuse a repository that has both.

#### Scenario: Both Files

- **WHEN** the root has `.minispec.yml` and `.minispec.yaml`
- **THEN** each `minispec` command exits with a status other than 0 and names both files
