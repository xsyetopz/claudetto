# settings-schema Specification

## Purpose

Gives a complete JSON Schema for Claude Code `settings.json` of the supported version (2.1.295 or later), and one for `managed-settings.json` as a reference only, because the public schema is out of date.
The schemas copy a Claude Code format and are not a dotclaude format (design D35).
dotclaude ships no managed template, so only the plugin `settings.json` and the wiki snippet are validated.

## Requirements

### Requirement: Generated from the installed version

A repository script SHALL make the schema from the installed Claude Code, by reading its bundle.
The script SHALL NOT change the bundle.

#### Scenario: Generate

- **WHEN** the user runs the schema script with Claude Code 2.1.295 installed
- **THEN** the script writes `schemas/claude-code-settings.json`, with no version in the file name
- **AND** the `$comment` keyword at the root of the file names Claude Code 2.1.295
- **AND** the file has no `x-claude-code-version` key

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

The repository SHALL hold the generated schema files for 2.1.295 and later, and no copy for an older version.
A test SHALL validate the plugin `settings.json` and the JSON block of the wiki snippet against them.

#### Scenario: Older copy

- **WHEN** a test lists `schemas/`
- **THEN** it finds `claude-code-settings.json` and `claude-code-managed-settings.json` only

#### Scenario: Unknown key

- **WHEN** the plugin `settings.json` or the snippet has a key that the schema does not have
- **THEN** the test fails and names the key
