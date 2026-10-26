## Purpose

claudetto keeps the model aware of the plan usage of the login, slows its delegation as usage rises, asks before costly work at a limit, and reports the cost of each change.

## ADDED Requirements

### Requirement: Usage Line

The `prompt` slice SHALL add one context line with the 5-hour and weekly shares when the band of either share changes, from the `session.measure` event.
The bands SHALL be green below 40%, amber from 40% to 80%, and red above 80%, from `kernel/budget.ts`, the same bounds as the status line.
It SHALL add no line when no band changes, and none for an API key.

#### Scenario: Band Change

- **WHEN** `session.measure` moves the 5-hour share from 39% to 41%
- **THEN** the next request holds one usage line that names amber and both shares

#### Scenario: Same Band

- **WHEN** `session.measure` moves the 5-hour share from 41% to 42%
- **THEN** the next request holds no usage line

#### Scenario: API Key

- **WHEN** the session has no `rate_limits`
- **THEN** no request holds a usage line

### Requirement: Parallel Count by Band

The body of `claudetto:main` SHALL tell Claude to plan at most the cap of setup for agents at a time at green, 2 at amber, and 1 at red.

#### Scenario: Amber Split

- **WHEN** an eval task has three separate file sets and the usage line names amber
- **THEN** Claude runs at most 2 `claudetto:Worker`s at a time

### Requirement: Gate at Red

When the 5-hour share is red, `guard` SHALL return `ask` with the share in the reason for an `Agent` call while another agent runs, and for each paid recipe (`just sandbox`, `just sandbox-alone`, and the eval recipes).
The weekly share SHALL NOT set the gate.
Below red, and with no `rate_limits`, the gate SHALL add no ask.

#### Scenario: Second Agent at Red

- **WHEN** the 5-hour share is 85% and one agent runs, and Claude calls `Agent`
- **THEN** `guard` returns `ask`, and the reason names 85%

#### Scenario: First Agent at Red

- **WHEN** the 5-hour share is 85%, no agent runs, and Claude calls `Agent`
- **THEN** `guard` adds no ask

#### Scenario: Weekly Red

- **WHEN** the weekly share is 95%, the 5-hour share is 30%, one agent runs, and Claude calls `Agent`
- **THEN** `guard` adds no ask

#### Scenario: Paid Recipe at Red

- **WHEN** the 5-hour share is 90% and Claude runs `just sandbox`
- **THEN** `guard` returns `ask`, and the reason names 90%

### Requirement: Cost Report

The final report of the skill `apply` and each handoff SHALL give the session cost and the change of each share since the start of the work, from `$.session.usage()`.
For an API key, it SHALL give the cost only.

#### Scenario: Apply Report

- **WHEN** an `apply` run ends after the 5-hour share went from 20% to 31%
- **THEN** its report names the cost and "+11%" for the 5-hour share

#### Scenario: Handoff

- **WHEN** a handover writes a handoff
- **THEN** the handoff holds the cost and each share change since the session start
