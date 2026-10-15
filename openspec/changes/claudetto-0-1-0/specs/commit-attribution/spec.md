# Spec Delta: `commit-attribution`

## Purpose

Adds the attribution lines of the model that did the work to each `git commit` and `gh pr create` that Claude runs.

## ADDED Requirements

### Requirement: Trailer on each commit form

Each `git commit` that Claude runs SHALL get the attribution trailer, also when the message comes from a heredoc, a here-string, or a file.

#### Scenario: A here-string message

- **WHEN** Claude runs `git commit -F - <<< "msg"`
- **THEN** the commit has the trailer

### Requirement: Model name from the kernel

The trailer SHALL name the model with the model parser of the kernel.

#### Scenario: A new model id

- **WHEN** the session model is `claude-sonnet-5-5`
- **THEN** the trailer names Claude Sonnet 5.5, not only `Claude`

### Requirement: Unreadable command

When the parser cannot read the command, the hook SHALL NOT treat it as "not a commit" in silence.
It SHALL leave the command unchanged and give a note that the trailer was not added.

#### Scenario: A command the parser cannot read

- **WHEN** a commit command hides its form from the parser
- **THEN** Claude gets a note that no trailer was added

### Requirement: Pull request body

Each `gh pr create` that Claude runs SHALL get the attribution line at the end of the body.

#### Scenario: A pull request

- **WHEN** Claude runs `gh pr create --body "text"`
- **THEN** the body ends with the attribution line
