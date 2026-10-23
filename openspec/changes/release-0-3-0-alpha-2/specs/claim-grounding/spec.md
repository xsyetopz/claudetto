## Purpose

claudetto stops a `Write` or an `Edit` that states a number or a fact with no source, and it counts each source that the writing agent saw.

## ADDED Requirements

### Requirement: Sources of the Writing Agent

The check SHALL count as a source each user message, each tool result, and each file of the project that the agent that makes the `Write` or `Edit` saw, also when that agent is a subagent.
A tool result of a subagent SHALL count for that subagent.

#### Scenario: Subagent Counts

- **WHEN** a subagent runs `jq` that prints `292`, and then writes a file that says "292 session files"
- **THEN** the `Write` runs

#### Scenario: Number with No Source

- **WHEN** an agent writes a number that no message, tool result, or file that it saw holds
- **THEN** the `Write` is stopped, and the reason names the number

### Requirement: Answers Count as User Words

The check SHALL count each answer of `AskUserQuestion` as a message of the user, so a line that says that the user chose an option has a source.

#### Scenario: Chosen Option

- **WHEN** the user answered "Allow" in `AskUserQuestion`, and the agent writes "The user chose Allow"
- **THEN** the `Write` runs

### Requirement: Example Values

The check SHALL NOT stop a number in a `#### Scenario:` block of a spec file, in a test file, or in a code block that a line marks as an example, because such a number is an input of a case and not a claim.

#### Scenario: Spec Scenario

- **WHEN** an agent writes a spec file with a scenario that holds a number that no source holds
- **THEN** the `Write` runs
