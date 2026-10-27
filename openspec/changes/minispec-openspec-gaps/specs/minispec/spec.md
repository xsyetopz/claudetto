## MODIFIED Requirements

### Requirement: Same Result as OpenSpec

For each command and flag of D22, `minispec` SHALL give the same exit status, the same `valid` value, and the same issues as OpenSpec 1.15.0 for the same input, and SHALL write the same files.
A difference SHALL be listed in the `differences` of its parity case.

#### Scenario: Duplicate Requirement

- **WHEN** a delta has two `### Requirement: Wave` blocks under `## ADDED Requirements`
- **THEN** `minispec validate --strict --json` gives `valid: false` with the ERROR `Duplicate requirement in ADDED: "Wave"`

#### Scenario: Archive Would Refuse

- **WHEN** a delta has `MODIFIED` for a requirement that the main spec lacks
- **THEN** `minispec validate` gives the ERROR `Archive would refuse this delta: greet MODIFIED failed for header "### Requirement: Goodbye" - not found`, and exits not `0`

#### Scenario: Already in Sync

- **WHEN** a delta only removes a requirement that the main spec lacks
- **THEN** `minispec archive --yes` prints `Specs already in sync; no files changed.` and the main `spec.md` keeps each byte

#### Scenario: Main Specs

- **WHEN** the user runs `minispec validate --specs --strict --json`
- **THEN** each spec in `openspec/specs/` is an item, and a short purpose gives the WARNING `Purpose section is too brief (less than 50 characters)`

## ADDED Requirements

### Requirement: Scenario Steps

`minispec validate` SHALL give a WARNING for each scenario that has no `WHEN` or `GIVEN` step, or no `THEN` step.

#### Scenario: Only an AND Step

- **WHEN** a scenario has only the step `- **AND** the ledger is balanced`
- **THEN** `minispec validate --strict` exits not `0` and names the scenario

### Requirement: Overlap of Open Changes

`minispec validate` SHALL give a WARNING when two open changes have a `MODIFIED`, `REMOVED`, or `RENAMED` entry for the same requirement of the same spec, and SHALL name the other change.

#### Scenario: Two Changes Modify One Requirement

- **WHEN** the open changes `o1` and `o2` both modify `### Requirement: Real` of `base`
- **THEN** `minispec validate o2 --strict` exits not `0` and names `o1`

### Requirement: Open Tasks in JSON

`minispec archive --yes --json` SHALL put the count of open tasks in its JSON output when `tasks.md` has an open task.

#### Scenario: One Open Task

- **WHEN** `tasks.md` has `- [ ] 1.1 undone` and the user runs `minispec archive <name> --yes --json`
- **THEN** the JSON has the open task count `1`

### Requirement: Scenario Rename

A `MODIFIED` block SHALL be able to declare that a scenario of the main spec has a new name, and `validate` and `archive` SHALL then not count the old scenario as dropped.

#### Scenario: Renamed Scenario

- **WHEN** a `MODIFIED` block renames the scenario `S` to `S renamed` with the declared form, and keeps its steps
- **THEN** `minispec validate --strict` exits `0`, and `minispec archive --yes` writes `#### Scenario: S renamed` to the main spec

### Requirement: Done Needs Content

`minispec status` SHALL mark an artifact `done` only when its file exists and each `##` section of its template has text in the file.

#### Scenario: Half-Written Proposal

- **WHEN** `proposal.md` has only the line `## Why`
- **THEN** `minispec status --change <name> --json` does not give `done` for `proposal`

### Requirement: OpenSpec Surface

`minispec` SHALL accept the schema name `spec-driven` as the preset `story`, SHALL refuse an unknown flag with exit `2`, and SHALL print the usage with exit `0` for `-h`, `--help`, and `help`.
A user of OpenSpec `1.15.0` then gets the same result or a clear error, and no silent default.

#### Scenario: OpenSpec Project

- **WHEN** `openspec/config.yaml` has `schema: spec-driven` and the user runs `minispec new change x` and `minispec status --change x`
- **THEN** both commands exit `0`

#### Scenario: Unknown Flag

- **WHEN** the user runs `minispec validate x --type change`
- **THEN** the command exits `2` and names `--type`

#### Scenario: Help

- **WHEN** the user runs `minispec --help`
- **THEN** the command prints the usage and exits `0`

### Requirement: Task Numbers

`minispec validate` SHALL give a WARNING when `tasks.md` has a task number twice or a task number lower than the one before it.

#### Scenario: Duplicate Number

- **WHEN** `tasks.md` has `- [ ] 1.2 a` and then `- [ ] 1.2 b`
- **THEN** `minispec validate --strict` exits not `0` and names `1.2`
