# secret-matcher Specification

## Purpose
Scan every tool result and every handoff with betterleaks, the one secret matcher, so a secret reaches the model as `[REDACTED]`, and withhold the text when the scan cannot run.

## Requirements

### Requirement: Betterleaks Is the One Secret Matcher

claudetto SHALL find secrets only with betterleaks, at the version `hooks/secrets.ts` pins, run with claudetto's inline config over the default rules, and SHALL hold no other secret pattern in its code.

#### Scenario: An Anthropic OAuth Token in a Tool Result

- **WHEN** a tool result holds an `sk-ant-oat01-` token
- **THEN** the model sees `[REDACTED]` in its place and the rest of the result as it was

#### Scenario: A Result With No Secret

- **WHEN** a tool result holds no secret
- **THEN** the result reaches the model unchanged

### Requirement: A Scan That Cannot Run Withholds the Text

When betterleaks is missing or fails, the gate SHALL deny the call with an error naming `brew install betterleaks`. An error raised beneath the gate SHALL reach the caller unchanged.

#### Scenario: A Missing Scanner

- **WHEN** a tool runs and `betterleaks` is not on `PATH`
- **THEN** the result is withheld and the reason names `brew install betterleaks`

### Requirement: Setup Names the Install Step

Setup SHALL list betterleaks as a required tool. Its launch notice SHALL show at every start while it is missing. A decline SHALL NOT be recorded, and the reply SHALL name the install command.

#### Scenario: A Decline

- **WHEN** the user answers No to installing betterleaks
- **THEN** nothing runs, nothing is recorded, and the reply names `brew install betterleaks`

### Requirement: Every Tool Result Is Scanned

The gate SHALL scan each tool's result before the model sees it, and an errored result that holds a secret SHALL reach the model redacted, as a deny.

#### Scenario: A Key in a Tool Result

- **WHEN** a tool result holds a key the scanner finds
- **THEN** the model sees `[REDACTED]` in its place
- **AND** the lab tests are in `gate.test.ts`, among them "an errored result with a secret reaches the model redacted, as a deny"
