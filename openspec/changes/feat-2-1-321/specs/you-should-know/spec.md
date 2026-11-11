## MODIFIED Requirements

### Requirement: Check Before Each Action

The observer SHALL consider a check before each main-loop tool call, only on the `terminal` or `desktop` surface. It SHALL skip a subagent's call, a question to the person (`AskUserQuestion`), and a call to a tool that changes nothing: `Read`, `Grep`, `Glob`, `ToolSearch`, `WebSearch`, `WebFetch`, and `ListAgents`. The call SHALL wait for the check, whose log ends with the call.

#### Scenario: Nothing to Say

- **WHEN** the check replies `learn: none`
- **THEN** the call runs

#### Scenario: A Subagent Call

- **WHEN** a subagent calls `Bash`
- **THEN** no check runs
