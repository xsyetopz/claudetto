## ADDED Requirements

### Requirement: Every Tool Result Is Scanned

The gate SHALL scan each tool's result before the model sees it, and an errored result that holds a secret SHALL reach the model redacted, as a deny.

#### Scenario: A Key in a Tool Result

- **WHEN** a tool result holds a key the scanner finds
- **THEN** the model sees `[REDACTED]` in its place
- **AND** the lab tests are in `gate.test.ts`, among them "an errored result with a secret reaches the model redacted, as a deny"

## MODIFIED Requirements

### Requirement: A Scan That Cannot Run Withholds the Text

When betterleaks is missing or fails, the gate SHALL deny the call with an error naming `brew install betterleaks`. An error raised beneath the gate SHALL reach the caller unchanged.

#### Scenario: A Missing Scanner

- **WHEN** a tool runs and `betterleaks` is not on `PATH`
- **THEN** the result is withheld and the reason names `brew install betterleaks`

## REMOVED Requirements

### Requirement: Every Tool Result and Every Handoff Is Scanned

**Reason**: The handoff is deleted, so no handoff is scanned.

**Migration**: "Every Tool Result Is Scanned" keeps the tool-result half.
