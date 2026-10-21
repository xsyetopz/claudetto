# jscpd Specification

## Purpose

Duplicate-code checks with jscpd, with a shipped base config, layered local configs, and a baseline.

## Requirements

### Requirement: Layered Configs

The system SHALL merge a `jscpd.local.json` and its `extends` chain into `.jscpd.json`, with deep merge of objects, append of the ignore lists, `<key>Remove`, and `null` to delete a key.

#### Scenario: A Local File Removes an Ignore

- **WHEN** a local file extends the base and has `ignoreRemove` with one glob of the base
- **THEN** the merged `ignore` has each glob of the base but that one, and the globs of the local file

#### Scenario: A Cycle

- **WHEN** two files extend each other
- **THEN** the merge exits with status 2 and names the cycle

### Requirement: Language-Agnostic

The system SHALL take the formats and extensions only from the config files, with no format list in code.

#### Scenario: A New Format

- **WHEN** a local file adds a format to `formatsExts`
- **THEN** the merged config has it with no code change

### Requirement: Gate on New Clones

The system SHALL fail `just check` when a change adds a clone that is not in `.jscpd-baseline.json`.

#### Scenario: A New Clone

- **WHEN** a commit copies a function of 20 lines into a second file
- **THEN** `just dry` exits with a status other than 0
