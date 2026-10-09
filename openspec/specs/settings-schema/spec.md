# settings-schema Specification

## Purpose

Gives a complete JSON Schema for Claude Code `settings.json` of the supported version, and one for `managed-settings.json` as a reference only, because the public schema is out of date.
dotclaude ships no managed template, so only the profile template is validated.

## Requirements

### Requirement: Generated from the installed version

A repository script SHALL make the schema from the installed Claude Code, by reading its bundle.
The script SHALL NOT change the bundle.

#### Scenario: Generate

- **WHEN** the user runs the schema script with Claude Code 2.1.295 installed
- **THEN** the script writes `schemas/claude-code-settings.json`, with no version in the file name
- **AND** the `x-claude-code-version` key in the file is 2.1.295

#### Scenario: Unknown bundle layout

- **WHEN** the script cannot find the settings schema in the bundle
- **THEN** it exits with an error that names the version, and writes no file

### Requirement: Complete keys

The schema SHALL hold each top-level key that the bundle defines, with its description, and the nested keys of `permissions`, `sandbox`, and `env`.

#### Scenario: Known missing keys

- **WHEN** the schema is made from 2.1.294 or later
- **THEN** it has `syncClaudeAiSkills`, `syncClaudeAiPlugins`, `prependPlugins`, `appendPlugins`, `skillOverrides`, and `disableClaudeAiConnectors`

### Requirement: Managed-only keys

The managed-settings schema SHALL hold the keys that only managed settings accept, and mark them.
It is a reference only, because dotclaude writes no managed file.

#### Scenario: Managed key in user file

- **WHEN** a user settings file has a managed-only key
- **THEN** the user schema reports the key as not valid there

### Requirement: Shipped and pinned

The repository SHALL hold the generated schema files.
A test SHALL validate each dotclaude settings template (the profile template) against them.

#### Scenario: Unknown key

- **WHEN** a template has a key that the schema does not have
- **THEN** the test fails and names the key
