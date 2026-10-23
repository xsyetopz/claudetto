# release-evidence Specification

## Purpose
Each claim of a saving or a fix in `0.3.0-alpha.1` has a check that ran, against the 0.2.0 baseline on Claude Code 2.1.306.

## Requirements

### Requirement: Fault Has a Test

Each fault in `.claudetto/0.3.0-findings.md` and in `research/sessions.md` SHALL have a test that fails on 0.2.0 and passes on 0.3.0, or a recorded reason to keep the behavior.

#### Scenario: Fault Map

- **WHEN** the release is ready
- **THEN** a table maps each fault to its test name or its reason

### Requirement: Context Measured

The release SHALL measure the empty-session context and the start context of each claudetto agent from the transcript `usage`, for 0.2.0 and 0.3.0, with the method of `docs/how-it-works/context-budget.md` of `claude-code-docs`.

#### Scenario: Empty Session

- **WHEN** both versions run the same empty session
- **THEN** the evidence file records both token counts and the method

### Requirement: Paired Repeat Runs

A claim of a saving SHALL come from paired runs of the same tasks on 0.2.0 and 0.3.0, with at least 3 runs of each task, and it SHALL state the median difference.
The self-report of a tool SHALL NOT count as a saving.

#### Scenario: Saving Claim

- **WHEN** the changelog states a token saving
- **THEN** the evidence file has the paired runs, their count, and the median

### Requirement: Paid Run Approval

Each paid run SHALL have the approval of the user first, with the expected cost and the current weekly share.

#### Scenario: Before a Sandbox Session

- **WHEN** a measure needs `just sandbox`
- **THEN** the user approves it before it runs

### Requirement: Checks Pass

`just docker check` SHALL pass, and it SHALL print the cause when Docker or OrbStack is not up.

#### Scenario: Docker Down

- **WHEN** `just docker check` runs with no `docker` on the `PATH`
- **THEN** it exits nonzero and prints the missing CLI and the command that starts it
