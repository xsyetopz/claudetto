# Spec Delta: `codegraph-addon`

## Purpose

Gives Claude the code graph of a project through the `codegraph` CLI and a lightweight skill by default, with an opt-in MCP server that the user adds with Claude Code, so that exploration uses less context.

## ADDED Requirements

### Requirement: CLI and skill by default

By default, the add-on SHALL give a skill that uses the `codegraph` CLI, and SHALL NOT start an MCP server.

#### Scenario: Default install

- **WHEN** the add-on is installed with no MCP setting
- **THEN** the tool list has no `codegraph` MCP tool, and the skill is listed

### Requirement: Opt-in MCP server

The add-on SHALL ship no MCP definition, because Claude Code starts each MCP server of a plugin.
The add-on SHALL give the user the command `claude mcp add --scope user codegraph -- bunx @colbymchenry/codegraph@1.6.0 serve --mcp` in its skill and its page, and the add-on SHALL install nothing itself.

The command `claudetto-codegraph-check --mcp` SHALL print that command and `claude mcp remove codegraph --scope user`, and SHALL run neither.

#### Scenario: MCP commands printed

- **WHEN** the user runs `claudetto-codegraph-check --mcp`
- **THEN** the output has the add command and the remove command, and no `codegraph` command runs

#### Scenario: MCP option on

- **WHEN** the user runs that command and starts a new session
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
