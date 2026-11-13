## MODIFIED Requirements

### Requirement: Advisor Asks Fable, or Mythos Where the Account Has It

The request MUST name `claude-fable-5-2`, or `claude-mythos-5-2` when `ANTHROPIC_DEFAULT_FABLE_MODEL` names it, the choice the `fable` alias makes. The function MUST send a full ID, because the lab rule on `$.model.complete` refuses an alias.

#### Scenario: A Mythos Account

- **WHEN** `ANTHROPIC_DEFAULT_FABLE_MODEL` is `claude-mythos-5-2`
- **THEN** the request goes to `claude-mythos-5-2`, and to `claude-fable-5-2` otherwise
- **AND** the lab tests `an account whose fable alias names Mythos asks Mythos` and `one model call at high effort carries the question and the named files, and its text comes back` check it
