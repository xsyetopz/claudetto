## MODIFIED Requirements

### Requirement: Keep the Built-in Rules

Each list that setup writes SHALL hold `$defaults` unless the classifier trim of D20 picked a rung without it. The picked rung is the one with the fewest characters at the least regression against the built-in classifier.

#### Scenario: Defaults Kept

- **WHEN** no trim rung without `$defaults` was picked
- **THEN** each list holds `$defaults`, and `claude auto-mode config` does not say "replacing defaults"

#### Scenario: Trim Picked

- **WHEN** the D20 reading picked a rung without `$defaults`
- **THEN** setup writes that rung, and the setup test checks it against the recorded rung

### Requirement: Do Not Replace the Built-in Rules to Save Size

Setup MUST NOT drop `$defaults` from an `autoMode` list as a size trim unless the user approves it. The user approved a trim by reading on 2026-10-30 (D20), so a rung without `$defaults` ships when its characters and its regression are read and recorded.

#### Scenario: Trim by Dropping Defaults

- **WHEN** a change shrinks the classifier request by removing `$defaults` with no recorded reading of its regression
- **THEN** the setup test fails and names the list

### Requirement: Choose the Classifier Model by Measurement

The classifier model and claudetto's own auto mode (Jev first, then Haiku 5.5 at `high`) SHALL be chosen by a paid A/B on the `just eval` cases against the built-in classifier run locally with `CLAUDE_CODE_AUTO_MODE_SERVER=0` (D17, D19). `CLAUDE_CODE_AUTO_MODE_MODEL` needs `2.1.302` or later, and a server-configured model wins, so the A/B SHALL record which model answered.

#### Scenario: No Evidence

- **WHEN** no A/B reading exists
- **THEN** setup does not set `CLAUDE_CODE_AUTO_MODE_MODEL` and no Jev hook decides a permission

## ADDED Requirements

### Requirement: The Classifier Request Is Read per Rung

`just capture` SHALL read the classifier request in characters with no model call, for each rung of D20: the built-in lists, custom lists, empty lists, and each `CLAUDE_CODE_AUTO_MODE_*` env key of `2.1.314` that changes the request.

#### Scenario: Rung Reading

- **WHEN** `just capture` runs a rung
- **THEN** it prints the characters of each part of the classifier request
