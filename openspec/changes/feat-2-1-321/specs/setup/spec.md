## ADDED Requirements

### Requirement: Output Limits Are Written

Setup SHALL write `bashOutputMaxChars` 8000 and `env.MAX_MCP_OUTPUT_TOKENS` "10000" to settings, so Claude Code cuts a Bash or MCP result itself and the plugin cuts none.

#### Scenario: Bash Result Limit

- **WHEN** `bashOutputMaxChars` is 8000 and a Bash call prints 20,000 characters
- **THEN** the model gets a preview of 2,258 characters and a path to the saved output (P191)

#### Scenario: MCP Result Limit

- **WHEN** `MAX_MCP_OUTPUT_TOKENS` is 2000 and an MCP result holds 40,000 characters
- **THEN** Claude Code cuts it (P192); setup writes the larger "10000"
- **AND** the lab test is `groups.test.ts`, "the output-limits group writes the Bash and MCP result limits Claude Code enforces"
