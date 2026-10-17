# Spec Delta: `jscpd`

## Purpose

Duplicate-code checks with jscpd, with a shipped base config, layered local configs, and a baseline.

## ADDED Requirements

### Requirement: Layered configs

The system SHALL merge a `jscpd.local.json` and its `extends` chain into `.jscpd.json`, with deep merge of objects, append of the ignore lists, `<key>Remove`, and `null` to delete a key.

#### Scenario: A local file removes an ignore

- **WHEN** a local file extends the base and has `ignoreRemove` with one glob of the base
- **THEN** the merged `ignore` has each glob of the base but that one, and the globs of the local file

#### Scenario: A cycle

- **WHEN** two files extend each other
- **THEN** the merge exits with status 2 and names the cycle

### Requirement: Language-agnostic

The system SHALL take the formats and extensions only from the config files, with no format list in code.

#### Scenario: A new format

- **WHEN** a local file adds a format to `formatsExts`
- **THEN** the merged config has it with no code change

### Requirement: Gate on new clones

The system SHALL fail `just check` when a change adds a clone that is not in `.jscpd-baseline.json`.

#### Scenario: A new clone

- **WHEN** a commit copies a function of 20 lines into a second file
- **THEN** `just dry` exits with a status other than 0
