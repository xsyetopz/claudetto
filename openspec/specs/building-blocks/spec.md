# building-blocks Specification

## Purpose
Claudetto's source is a catalog of building blocks, each changing one surface of Claude Code, so a new surface is one new module and a host change breaks one block.

## Requirements

### Requirement: Each Surface Change Is a Block

Each change claudetto makes to Claude Code SHALL live in one block that names its `id`, `kind`, `routes` in the host's event type, and `needs` version, and exports one attach function named at the top of its file. `register.ts` SHALL call only `attachBlocks`, which calls each block's attach function by name.

#### Scenario: A Block Is Not Wired

- **WHEN** `attachBlocks` does not call a block's attach function
- **THEN** that block's lab case fails, because its hooks never register

### Requirement: A Route Change Fails One Block

Each block SHALL have a hook lab file with a case per route, and SHALL need no Claude Code above the version floor (D28).

#### Scenario: Host Change

- **WHEN** a route a block rides changes its input or result
- **THEN** that block's lab case fails, and the other blocks' cases still pass
