## MODIFIED Requirements

### Requirement: Each Surface Change Is a Block

Each change claudetto makes to Claude Code SHALL live in one block that names its `id`, `kind`, `routes` in the host's event type, and `needs` version, and exports one attach function named at the top of its file. `register.ts` SHALL call only `attachBlocks`, which calls each block's attach function by name.

#### Scenario: A Block Is Not Wired

- **WHEN** `attachBlocks` does not call a block's attach function
- **THEN** that block's lab case fails, because its hooks never register
