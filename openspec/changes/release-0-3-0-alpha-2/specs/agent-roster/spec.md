## MODIFIED Requirements

### Requirement: Fixed Agent Settings

Each claudetto agent SHALL set `model`, `effort`, `tools`, and `omitClaudeMd`, and it SHALL NOT set `maxTurns`.
The roster SHALL have the categories Inspector, Modifier, and Tester, and these settings:
`Scout` Haiku 5.5 at `low`, `Scoper` Sonnet 5.5 at `medium`, `Reviewer` Sonnet 5.5 at `medium`, `Researcher` Sonnet 5.5 at `medium`, `Worker` Sonnet 5.5 at `medium`, and `Tester` Haiku 5.5 at `low`.
Its `tools` list SHALL hold only the tools that its task needs, and its description SHALL be one line that starts with "Use proactively" and names the moment.
Its result to the parent SHALL be short: what it found or changed, with paths, and each block.
`Researcher` SHALL return its report as its final message and have no `Write`.
`Tester` SHALL have no `Edit` or `Write`.

#### Scenario: Read-Only Agent

- **WHEN** the roster test reads `Scout`, `Scoper`, `Reviewer`, `Researcher`, and `Tester`
- **THEN** no tool list has `Edit`, `Write`, or `Agent`

#### Scenario: Reviewer Effort

- **WHEN** the roster test reads `Reviewer`
- **THEN** it has Sonnet 5.5 at `medium`

#### Scenario: Haiku Work

- **WHEN** the roster test reads each agent on Haiku 5.5
- **THEN** it is `Scout` or `Tester`, and it has no `WebSearch` or `WebFetch`

#### Scenario: Researcher Report

- **WHEN** `Researcher` finishes a web question
- **THEN** the report is its final message, and it wrote no file

#### Scenario: Description

- **WHEN** the roster test reads each description
- **THEN** each starts with "Use proactively"

## ADDED Requirements

### Requirement: UpperCase Names

Each agent file SHALL have an UpperCase file name and an equal `name`, so Claude Code names it `claudetto:<Name>`.
The lowercase names SHALL go.

#### Scenario: Name Loads

- **WHEN** a `just sandbox` session spawns the agent of `agents/Scout.md`, because the hook lab loads no agent file
- **THEN** the agent type is `claudetto:Scout`

#### Scenario: Deny Rule

- **WHEN** `permissions.deny` holds `Agent(claudetto:Scout)` and Claude calls `Agent` with `claudetto:Scout`
- **THEN** the call is denied

### Requirement: Delegation by Fit

The body of `claudetto:main` SHALL name each agent of the roster with the work that it fits: `claudetto:Scoper` first for work over more than one file set, `claudetto:Worker` for one planned edit step with its check, in parallel on separate file sets, `claudetto:Tester` after each group of `Worker`s, `claudetto:Reviewer` for a review of a finished diff, `claudetto:Scout` for a search over many files, and `claudetto:Researcher` for web research.
It SHALL tell Claude to keep decisions and the talk with the user in the main context.

#### Scenario: Multi-File Search

- **WHEN** an eval task needs a search over more than 20 files and an edit that depends on it
- **THEN** Claude starts `claudetto:Scout` for the search, in each repeat run

#### Scenario: Split Work

- **WHEN** an eval task changes two separate file sets
- **THEN** Claude starts `claudetto:Scoper`, then one `claudetto:Worker` for each file set in parallel, in each repeat run

#### Scenario: Finished Diff

- **WHEN** an eval task ends with a diff of more than one file
- **THEN** Claude starts `claudetto:Reviewer` before it reports, in each repeat run

#### Scenario: One-Line Fix

- **WHEN** an eval task is a one-line fix in a named file
- **THEN** Claude starts no agent

### Requirement: Delegation by Cost

The body of `claudetto:main` SHALL tell Claude to pick the cheapest agent that fits the work, and to give Haiku 5.5 no research, fact check, or judgment.

#### Scenario: Check Run

- **WHEN** an eval task needs the test suite run and its failures listed
- **THEN** Claude starts `claudetto:Tester`, not `claudetto:Worker`

### Requirement: No Model in Agent Calls

The body of `claudetto:main` SHALL tell Claude to pass no `model` in an `Agent` call, so the frontmatter of the agent applies.

#### Scenario: Agent Call

- **WHEN** an eval run starts `claudetto:Worker`
- **THEN** the call holds no `model` and the agent runs Sonnet 5.5
