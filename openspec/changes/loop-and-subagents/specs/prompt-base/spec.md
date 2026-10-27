## ADDED Requirements

### Requirement: Subagents after Clear

When the docs or a probe show that running subagents and background tasks survive `/clear` and `/compact`, `claudetto:main` SHALL have one line that says so and names the tool that lists them.

#### Scenario: After Clear

- **WHEN** a subagent runs and the user runs `/clear`
- **THEN** the model lists the running agents before it starts the same work again
