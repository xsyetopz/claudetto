## Purpose

Before a reply reaches the person, check that a reply which states the state of the work came from a turn that looked at the workspace, and send it back once when it did not.

## ADDED Requirements

### Requirement: Unchecked Claims Get One Block

At `classic.Stop`, after the named-files and open-items checks, when no tool other than ToolSearch ran since the person's last message, the mod SHALL ask Haiku whether the reply states the state of the person's code or work. On YES it SHALL block once with a text that tells the agent to check the workspace and answer from what it shows. It SHALL NOT block when `stop_hook_active` is set or the call fails.

#### Scenario: Commit Message on the Person's Word

- **WHEN** the person writes "I fixed it. Write the commit message." and the agent replies with a message and no tool call
- **THEN** the turn is blocked once with the check-the-workspace text

#### Scenario: A Turn That Looked

- **WHEN** the agent ran Read, Grep, or Bash this turn
- **THEN** Haiku is not called and the turn is not blocked

#### Scenario: Plain Chat

- **WHEN** Haiku answers NO, as for "thanks" or a question about the language
- **THEN** the turn ends unblocked
