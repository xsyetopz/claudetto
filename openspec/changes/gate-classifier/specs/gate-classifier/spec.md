## ADDED Requirements

### Requirement: Classifier Stage

Each `ask` of the gate SHALL go to Jev first and then to `CLASSIFIER_MODEL` at the `high` effort, and a person SHALL decide it only when neither settles it (the user, 2026-10-27).

#### Scenario: Jev Is Sure

- **WHEN** the gate asks, and Jev answers `P(yes)` of `JEV_YES_MIN` or more
- **THEN** the call runs, and no model call is made

#### Scenario: Model Allows

- **WHEN** Jev is not sure, and the model answers `<block>no</block>`
- **THEN** the call runs, and its reason holds the reason of the model

#### Scenario: Model Blocks

- **WHEN** the model answers `<block>yes</block>`
- **THEN** the call is denied with the reason of the model

#### Scenario: Fault

- **WHEN** the model call fails, times out, or gives no single `<block>` tag
- **THEN** a person decides the `ask`

### Requirement: Breaker

The stage SHALL send the next `ask` to a person after `CLASSIFIER_STREAK_MAX` denials in a row, and each `ask` after `CLASSIFIER_DENIALS_MAX` denials in one session.

#### Scenario: Denials in a Row

- **WHEN** the model denied 3 calls in a row
- **THEN** the next `ask` goes to a person with no model call, and the one after goes to the model again

### Requirement: One Classification for One Call

`classic.PermissionRequest` SHALL read the verdict of `tool.check` for the same call within `SETTLED_MS`.

#### Scenario: Dialog of a Safety Check

- **WHEN** `tool.check` got an allow from the model, and Claude Code still shows the dialog
- **THEN** `classic.PermissionRequest` allows the call with no second model call

### Requirement: Off Switch

The option `classifier` set to `off` SHALL turn off the model step, and Jev SHALL follow the `decide` option.

#### Scenario: Off

- **WHEN** the option is `off`, and Jev is not sure
- **THEN** a person decides, and no model call is made
