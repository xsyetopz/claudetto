## ADDED Requirements

### Requirement: Opening Judge

The `Stop` hook SHALL read the first `OPENING_SENTENCES` sentences of `last_assistant_message` and the last request of the user, and SHALL ask Jev, and then `OPENING_MODEL` at the `low` effort, whether the reply opens with agreement, praise, an apology, or self-blame, or with a sentence that the user did not ask for, in place of the outcome or the next action. The judge SHALL match no word, so it works in any language (the user, 2026-10-27).

#### Scenario: Jev Is Sure of Yes

- **WHEN** Jev answers `P(yes)` of `OPENING_YES_MIN` or more
- **THEN** the stop is blocked, and no model call is made

#### Scenario: Jev Is Sure of No

- **WHEN** Jev answers `P(yes)` of `OPENING_NO_MAX` or less
- **THEN** the stop goes on, and no model call is made

#### Scenario: Jev Is Not Sure

- **WHEN** Jev is not available or answers between the two limits, and the model answers `<block>yes</block>`
- **THEN** the stop is blocked

#### Scenario: Fault

- **WHEN** the call of Jev and the call of the model fail, time out, or give no single `<block>` tag
- **THEN** the stop goes on

### Requirement: Block Once

The hook SHALL block a stop one time, and its reason SHALL ask Claude to send the reply again with the outcome or the next action as the first words and with no sentence of agreement, apology, or self-blame.

#### Scenario: Second Stop

- **WHEN** `stop_hook_active` is `true`
- **THEN** the hook makes no call, and the stop goes on

### Requirement: Off Switch

The option `classifier` set to `off` SHALL skip the model step, and Jev SHALL follow the `decide` option.

#### Scenario: Off

- **WHEN** the option is `off`, and Jev is not sure
- **THEN** the stop goes on, and no model call is made
