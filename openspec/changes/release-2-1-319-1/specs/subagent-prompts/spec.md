## ADDED Requirements

### Requirement: The Root Delegates a Slice by Its Measured Cost

The root SHALL keep a slice that would add less to its context than a subagent's cold start costs, and SHALL delegate a slice that would add more, at the model that finishes it. The cut-off values SHALL come from the logged runs of task 4.2, not from this text.

#### Scenario: A Small Lookup

- **WHEN** a slice is one file read or fewer than about 5 requests
- **THEN** the root does it itself, because a fresh Artemis writes about 5k and a fresh Heracles about 11k tokens before any work (observed, 6 runs, 2026-11-09)

#### Scenario: A Wide Search or a Specified Edit

- **WHEN** a slice would add more than about 25k tokens of reads to the root, or has a clear spec and a check command
- **THEN** it goes to Artemis for search or Heracles for the edit, at Sonnet

#### Scenario: Design or a Cross-Cutting Edit

- **WHEN** a slice needs judgment across files, or no check command can show it is done
- **THEN** the root keeps it, or passes `model: opus` on the `Agent` call

### Requirement: A Delegated Edit Comes Back with Its Check

An edit slice SHALL carry the command that checks it, and the root SHALL run that command when the report arrives, before it builds on the work. Each delegated run SHALL be logged with agent, model, duration, cache hit rate, and whether the root edited the same files within its next 3 turns.

#### Scenario: The Check Fails

- **WHEN** a Heracles report says done and the check command fails
- **THEN** the run is logged as redone, and the root fixes or re-sends the slice with the failure text

#### Scenario: The Log Decides the Model

- **WHEN** 10 or more edit runs are logged and the redo rate at Sonnet for a kind of slice exceeds the cost saved against the root doing it
- **THEN** that kind of slice moves to Opus or to the root

### Requirement: One Place Sets the Subagent Cache TTL

The subagent cache TTL SHALL be set only by the `subagentPromptCacheTtl` setting, and no agent file SHALL carry `cacheTtl`. The value SHALL stay `1h` until the run log shows how often a subagent's requests are more than 5 minutes apart.

#### Scenario: The Agent Files

- **WHEN** `plugins/claudetto/agents/*.md` is read
- **THEN** none holds `cacheTtl`

#### Scenario: The Log Shows No Long Gaps

- **WHEN** the logged runs show fewer than 1 in 7 subagent runs with a gap over 300s between requests
- **THEN** the value moves to `5m`, because the 1h write premium cost about 25% of subagent input on the 2026-11-09 sample and saved no miss there
