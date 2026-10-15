# Spec Delta: `codegraph-addon`

## Purpose

Gives Claude the code graph of a project through the `codegraph` CLI and a lightweight skill by default, with an opt-in MCP server, so that exploration uses less context.

## ADDED Requirements

### Requirement: CLI and skill by default

By default, the add-on SHALL give a skill that uses the `codegraph` CLI, and SHALL NOT start an MCP server.

#### Scenario: Default install

- **WHEN** the add-on is installed with no MCP setting
- **THEN** the tool list has no `codegraph` MCP tool, and the skill is listed

### Requirement: Opt-in MCP server

When the user turns the MCP option on, the add-on SHALL install and set up the `codegraph` MCP server through `bunx`.

#### Scenario: MCP option on

- **WHEN** the user turns the MCP option on and starts a new session
- **THEN** the `codegraph` MCP tools are in the tool list

### Requirement: Index stays in sync

The add-on SHALL sync the index at session start, after an edit, and after a `git` command that changes the tree.
Only one sync SHALL run on one index at a time.

#### Scenario: Two edits close together

- **WHEN** two edits end within one second
- **THEN** one sync runs at a time, and the index holds both edits after the last sync

### Requirement: CLI errors are not a missing CLI

A failed `codegraph` call SHALL show as an error, not as a missing CLI.

#### Scenario: The CLI fails

- **WHEN** `codegraph` is installed and exits with an error
- **THEN** the notice gives the error, not an install hint

### Requirement: One shell parser

The add-on SHALL detect a tree change with the shell parser of the kernel.

#### Scenario: A wrapped `git` command

- **WHEN** Claude runs `env GIT_DIR=.git git checkout main`
- **THEN** the add-on syncs the index
