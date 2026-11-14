## MODIFIED Requirements

### Requirement: Setup Turns the Built-In Advisor Off

Setup MUST write `CLAUDE_CODE_DISABLE_ADVISOR_TOOL` with the value `1` in the env of its Features off group, because the built-in advisor sends the executor's whole transcript to a second model with no cache on each call.

#### Scenario: Setup Writes the Key

- **WHEN** setup writes the Features off group
- **THEN** its `env` holds `CLAUDE_CODE_DISABLE_ADVISOR_TOOL` with the value `1`
- **AND** the lab test `the features-off group ends a silent background subagent, quiets the turn reminder, and writes no script caps` checks it

## REMOVED Requirements

### Requirement: Advisor Is a Tool and a Command on One Function

**Reason**: A prompt cache is keyed to its model, so a Fable call cannot read the main thread's cache, and each advisor question paid full input price on Fable. The `advisor` tool, the `/advisor` command, and `useAdvisorTool` and `useAdvisorCommand` are deleted.

**Migration**: Ask the `Athena` agent for a review, or switch the session model with `/model`.

### Requirement: Advisor Asks Fable, or Mythos Where the Account Has It

**Reason**: The advisor is deleted; see "Advisor Is a Tool and a Command on One Function".

**Migration**: None.

### Requirement: Advisor Sends Nothing It Could Not Check

**Reason**: The advisor is deleted; see "Advisor Is a Tool and a Command on One Function".

**Migration**: None.

### Requirement: The Advisor Command Takes Each @path Word as a File

**Reason**: The advisor is deleted; see "Advisor Is a Tool and a Command on One Function".

**Migration**: None.
