## ADDED Requirements

### Requirement: A Machine Short of Memory Holds New Work

Before each `Bash` or `Monitor` call and each subagent start, the system SHALL read the machine's free memory share, and below `memoryFreeMinPercent` (a `userConfig` option, default 20, 0 off) SHALL deny the call with a reason that names the free share and the five largest processes by pid and size and tells the agent to stop its own runs and wait. A command that is read-only, or whose every program is `kill`, SHALL pass. Where the share cannot be read, the call SHALL pass.

#### Scenario: Low Memory

- **WHEN** the free share is below the limit and a `Bash` call runs `bunx oxlint src/a.ts`
- **THEN** the call is denied, and the reason names the share and the largest processes

#### Scenario: Low Memory, a Kill

- **WHEN** the free share is below the limit and a `Bash` call runs `kill 4242` or `ps -ax`
- **THEN** the call goes on

#### Scenario: Low Memory, a Subagent

- **WHEN** the free share is below the limit and a subagent starts
- **THEN** the start is denied with the same reason

#### Scenario: Enough Memory, or the Limit Off

- **WHEN** the free share is at or above the limit, or `memoryFreeMinPercent` is 0, or the platform gives no share
- **THEN** the call goes on
