## Purpose

A run cannot burn usage without bound. The design is borrowed from `agent-usage-guard` (MIT) and `loop-breaker` of `mishgoldenberg/claude-mods` (MIT), and the defaults are theirs, each copied with its source line into `design.md`, "Run Limits". This spec states no value, and our own rows change them later.

## ADDED Requirements

### Requirement: Hold Subagent Fan-Out

The system SHALL hold a subagent start through the `agent.spawn` hook when the starts in the window pass the cap, with a `deny` reason that names the count and the setting to change (`AgentSpawnResult.deny` is a `string` per `clawdipedia` route `extend/mod-api/agent`). The length of the window and the default of the cap come from `design.md`, "Run Limits".

#### Scenario: Burst

- **WHEN** the cap is reached inside the window
- **THEN** the next start is denied with the count and how to raise the cap

### Requirement: Cap Calls at Heavy Context

The system SHALL cap tool calls per period when the context is heavy, and SHALL tell the model why. The period, the cap, and the meaning of heavy come from `agent-usage-guard` as `design.md`, "Run Limits", records it.

#### Scenario: Heavy Context Loop

- **WHEN** the calls in the period pass the cap at heavy context
- **THEN** the next call is held and the model receives one line with the reason

### Requirement: Refuse Repeated Failures

After the same call fails the fail limit, the system SHALL refuse an identical retry and tell the model to stop and report. The starting values of `failLimit` and `editLimit` are those of `loop-breaker` as `design.md`, "Run Limits", records them, and this spec states neither.

#### Scenario: Identical Failure at the Limit

- **WHEN** the same command has failed `failLimit` times with the same error
- **THEN** the next identical call is refused with the earlier error as the reason

### Requirement: Background Tasks at Stop

At Stop, the system SHALL report each background task still running, using `background_tasks` from the Stop input.

#### Scenario: Running Monitor

- **WHEN** a monitor still runs at Stop
- **THEN** the reply lists it

### Requirement: End Stuck Agents

The system SHALL end a subagent that `design.md`, "Run Limits", defines as stuck. This requirement states no limit, and it is not built while the time half of that definition is unmeasured and no reading shows how a mod ends a foreground subagent.

#### Scenario: Source of the Definition

- **WHEN** the definition is written
- **THEN** it reads `loop-breaker` and the one self-report that calls an agent stuck after "an hour or more with no real changes", or in a loop of the same action (`external/2026-10-27/reddit.com-r-claudeai-comments-1xeozdj-usage-cap-advice-for-the-nontech-20261026T132736Z.md`, line 90), which is not a measurement

#### Scenario: Stuck Agent

- **WHEN** a running subagent meets that definition
- **THEN** the system ends it and tells the model why in one line

### Requirement: Limits Are Settings

The cap, the window, and the fail limits SHALL come from `userConfig`, and the user SHALL be able to override each. The default of the window is the value that `design.md`, "Run Limits", records.

#### Scenario: Override

- **WHEN** the user sets a cap in `userConfig`
- **THEN** the system uses it in place of the default
