## MODIFIED Requirements

### Requirement: The Root Delegates a Slice by Its Measured Cost

The root SHALL keep a slice that would add less to its context than a subagent's cold start costs, and SHALL delegate a slice that would add more, at the model that finishes it. The cut-off values SHALL come from measured runs, not from this text.

#### Scenario: A Small Lookup

- **WHEN** a slice is one file read or fewer than about 5 requests
- **THEN** the root does it itself, because a fresh Artemis writes about 5k and a fresh Heracles about 11k tokens before any work (observed, 6 runs, 2026-11-09)

#### Scenario: A Wide Search or a Specified Edit

- **WHEN** a slice would add more than about 25k tokens of reads to the root, or has a clear spec and a check command
- **THEN** it goes to Artemis for search or Heracles for the edit, at Sonnet

#### Scenario: Design or a Cross-Cutting Edit

- **WHEN** a slice needs judgment across files, or no check command can show it is done
- **THEN** the root keeps it, or passes `model: opus` on the `Agent` call

## ADDED Requirements

### Requirement: A Delegated Edit Is Checked When It Returns

An edit slice SHALL carry the command that checks it, and the root SHALL run that command when the report arrives, before it builds on the work.

#### Scenario: The Check Fails

- **WHEN** a Heracles report says done and the check command fails
- **THEN** the root fixes or re-sends the slice with the failure text

#### Scenario: The Agent Text Carries the Rule

- **WHEN** the root reads the `Agent` tool description
- **THEN** it holds "Give an edit task the command that checks it, and run that command when the report arrives, before you build on it." (`hooks/texts.ts`, `AGENT_TEXT`)

### Requirement: The Subagent Cache TTL Has One Setting

The subagent cache TTL SHALL be set only by the `subagentPromptCacheTtl` setting, and no agent file SHALL carry `cacheTtl`. The value SHALL stay `1h`.

#### Scenario: The Agent Files

- **WHEN** `plugins/claudetto/agents/*.md` is read
- **THEN** none holds `cacheTtl`

## REMOVED Requirements

### Requirement: A Delegated Edit Comes Back with Its Check

**Reason**: Its scenarios "A Run Is Logged after 3 Root Turns" and "The Log Decides the Model" rest on `runs.jsonl`, whose writer the run-log removal deletes, and a MODIFIED block cannot drop a scenario.

**Migration**: "A Delegated Edit Is Checked When It Returns" keeps the rule and its other scenarios.

### Requirement: One Place Sets the Subagent Cache TTL

**Reason**: Its scenario "The Log Shows No Long Gaps" rests on `runs.jsonl`, whose writer the run-log removal deletes, and a MODIFIED block cannot drop a scenario.

**Migration**: "The Subagent Cache TTL Has One Setting" keeps the rule and its other scenarios.
