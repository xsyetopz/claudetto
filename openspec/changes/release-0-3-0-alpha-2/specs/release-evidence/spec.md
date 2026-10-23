## MODIFIED Requirements

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

## ADDED Requirements

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
