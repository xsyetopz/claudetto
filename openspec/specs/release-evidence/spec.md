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

Each paid run SHALL have the approval of the user first.
The plan SHALL put edits first, then the free checks (`just check`, `just lab`), then the paid checks in the last group.
The paid checks SHALL come in one question to the user, with the cost and the weekly share.

#### Scenario: Before a Sandbox Session

- **WHEN** a measure needs `just sandbox`
- **THEN** the user approves it before it runs

#### Scenario: Order of Work

- **WHEN** the release plan lists its task groups
- **THEN** the paid checks are in the last group, after the free checks

#### Scenario: One Question

- **WHEN** the paid group starts
- **THEN** one `AskUserQuestion` names the cost and the weekly share of all paid runs

### Requirement: Checks Pass

`just docker check` SHALL pass, and it SHALL print the cause when Docker or OrbStack is not up.

#### Scenario: Docker Down

- **WHEN** `just docker check` runs with no `docker` on the `PATH`
- **THEN** it exits nonzero and prints the missing CLI and the command that starts it

### Requirement: Tested Claude Code Version

The release SHALL name Claude Code 2.1.309 as the minimum and the tested version in `tools/limits.ts`, the CI workflow, `README.md`, `CONTRIBUTING.md`, the schemas, the tool text fixtures, the issue templates, and `src/wiki/`.
A test SHALL read the version from `tools/limits.ts` and fail on each other copy that differs.

#### Scenario: Stale Pin

- **WHEN** `CONTRIBUTING.md` names `2.1.302` and `tools/limits.ts` names `2.1.309`
- **THEN** the test fails and names `CONTRIBUTING.md`

### Requirement: Arms Are What They Say

A sandbox session and a paired eval SHALL fail when the plugin set or the model that loaded differs from the arm.
A paired eval SHALL report "the case does not separate the arms" when the baseline arm gets the same score as the claudetto arm.

#### Scenario: No Plugin Loaded

- **WHEN** the claudetto arm of an eval loads no plugin
- **THEN** the run fails and names the arm

### Requirement: Plan Share in Paid Runs

Each recipe of a paid run SHALL print the share of the plan limits that the run used when the login is a subscription, next to the cost bound in dollars.

#### Scenario: Eval on Max

- **WHEN** `just eval` runs on a Max login
- **THEN** the output gives the share of the weekly limit before and after the run
