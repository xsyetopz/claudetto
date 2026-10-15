# Spec Delta: `docs-addon`

## Purpose

Gives Claude current library docs through the `ctx7` CLI and a lightweight skill by default, with an opt-in `context7` MCP server.

## ADDED Requirements

### Requirement: CLI and skill by default

By default, the add-on SHALL give a skill that runs a pinned version of `ctx7`, and SHALL NOT start an MCP server.

#### Scenario: Default install

- **WHEN** the add-on is installed with no MCP setting
- **THEN** the skill runs `ctx7` at the pinned version, and the tool list has no `context7` tool

### Requirement: Opt-in MCP server

When the user turns the MCP option on, the add-on SHALL install and set up the `context7` MCP server.

#### Scenario: MCP option on

- **WHEN** the user turns the MCP option on and starts a new session
- **THEN** the `context7` MCP tools are in the tool list

### Requirement: Docs of the project version

The skill SHALL ask for the docs of the library version that the project uses, when the project names one.

#### Scenario: A pinned dependency

- **WHEN** `package.json` pins `zod` 4.6.2 and Claude asks for `zod` docs
- **THEN** the request names version 4.6.2

### Requirement: Read-only permission

The permission rules of the add-on SHALL allow only the read subcommands of `ctx7`, with the same runner that the skill uses.

#### Scenario: A write subcommand

- **WHEN** Claude runs a `ctx7` subcommand that writes
- **THEN** Claude Code asks for permission
