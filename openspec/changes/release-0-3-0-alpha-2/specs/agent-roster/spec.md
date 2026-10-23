## MODIFIED Requirements

### Requirement: Fixed Agent Settings

Each claudetto agent SHALL set `model`, `effort`, `tools`, and `omitClaudeMd`, and it SHALL NOT set `maxTurns`.
The settings SHALL be: `scout` Haiku 5.5 at `low`, `worker` Sonnet 5.5 at `medium`, `reviewer` Sonnet 5.5 at `medium`, and `researcher` Sonnet 5.5 at `medium`.
Its `tools` list SHALL hold only the tools that its task needs, and its description SHALL be one line that starts with "Use proactively" and names the moment.
Its result to the parent SHALL be short: what it found or changed, with paths, and each block.
`researcher` SHALL return its report as its final message and have no `Write`.

#### Scenario: Read-Only Agent

- **WHEN** a read-only search agent runs
- **THEN** its tool list has no `Edit`, `Write`, or `Agent`

#### Scenario: Reviewer Effort

- **WHEN** the roster test reads `reviewer`
- **THEN** it has Sonnet 5.5 at `medium`

#### Scenario: Researcher Report

- **WHEN** `researcher` finishes a web question
- **THEN** the report is its final message, and it wrote no file

#### Scenario: Description

- **WHEN** the roster test reads each description
- **THEN** each starts with "Use proactively"

## ADDED Requirements

### Requirement: Delegation by Fit

The body of `claudetto:main` SHALL name each agent of the roster with the work that it fits: `claudetto:scout` for a search over many files, `claudetto:worker` for one planned edit step with its check, `claudetto:reviewer` for a review of a finished diff, and `claudetto:researcher` for web research.
It SHALL tell Claude to keep decisions and the talk with the user in the main context.

#### Scenario: Multi-File Search

- **WHEN** an eval task needs a search over more than 20 files and an edit that depends on it
- **THEN** Claude starts `claudetto:scout` for the search, in each repeat run

#### Scenario: Finished Diff

- **WHEN** an eval task ends with a diff of more than one file
- **THEN** Claude starts `claudetto:reviewer` before it reports, in each repeat run

#### Scenario: One-Line Fix

- **WHEN** an eval task is a one-line fix in a named file
- **THEN** Claude starts no agent

### Requirement: No Model in Agent Calls

The body of `claudetto:main` SHALL tell Claude to pass no `model` in an `Agent` call, so the frontmatter of the agent applies.

#### Scenario: Agent Call

- **WHEN** an eval run starts `claudetto:worker`
- **THEN** the call holds no `model` and the agent runs Sonnet 5.5
