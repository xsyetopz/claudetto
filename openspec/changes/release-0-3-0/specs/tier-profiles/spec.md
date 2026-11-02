## ADDED Requirements

### Requirement: Every Alias and the Default Resolve to the Row's Models

The tier snippet SHALL write `ANTHROPIC_DEFAULT_MODEL`, `ANTHROPIC_DEFAULT_OPUS_MODEL`, `ANTHROPIC_DEFAULT_SONNET_MODEL`, and `ANTHROPIC_DEFAULT_HAIKU_MODEL` under `env`, each set to a full model ID of the row, so that `default`, `opus`, `sonnet`, `haiku`, `opusplan`, and an agent's `model:` alias never resolve to an older model.

#### Scenario: Default Is Opus 5 on the Account

- **WHEN** the `/model` picker shows "Default (recommended) Opus 5" and a session starts with no `model` key
- **THEN** its requests name `claude-opus-5-5`

#### Scenario: Plan Alias

- **WHEN** a setting or an agent names `opusplan` or `opus`
- **THEN** the plan or main request names `claude-opus-5-5`, not `claude-opus-5`

### Requirement: A Model Off the Row Is Shown

When a response of the main thread or a subagent names a model that the row does not name, claudetto SHALL show the user one line with the model it got and the model the row names, once per session and model.

#### Scenario: Silent Opus 5

- **WHEN** the row names `claude-opus-5-5` and a response names `claude-opus-5`
- **THEN** the user sees a line naming both, in the first turn it happens
