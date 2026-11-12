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

## MODIFIED Requirements

### Requirement: The Shipped Code Rules Are Offered as Copies

Setup SHALL offer each of the seven shipped rules (`useLeastCode`, `noUnrequestedEdits`, `noImpossibleStateGuards`, `findFactsByExperiment`, `useOneObviousWay`, `useBlockLanguage`, `lookForAClone`) as a copy to `<config>/rules/claudetto/<name>.md`, showing the whole rule text and saying that a session loads it at its start. It SHALL offer none that the user already holds byte for byte, SHALL store the SHA-256 of a copy it wrote, and SHALL stop the rest when a question is dismissed.

#### Scenario: Each Missing Rule

- **WHEN** the user holds none of the rules
- **THEN** each is a dialog of its own, and a Write puts the shipped text under `rules/claudetto` and writes no settings key (`hooks/setup.rules.test.ts`, "each rule the user lacks is a dialog of its own", "Write puts the shipped text under rules/claudetto and writes no settings key")

#### Scenario: A Dismissed Question

- **WHEN** a rule question is dismissed
- **THEN** the rest are not asked and the report says so ("a dismissed rule dialog stops the rest and says so")

#### Scenario: The Dialog Text

- **WHEN** a rule dialog opens
- **THEN** it shows the whole rule and says the rule loads at the start of a session ("a rule dialog shows the whole rule and says it loads at session start")
