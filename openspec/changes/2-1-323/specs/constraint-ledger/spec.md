## ADDED Requirements

### Requirement: Compaction Keeps the Person's Corrections

A classic `PreCompact` command hook SHALL print the instruction "Keep the person's corrections, refusals, and consents word for word.", so that each compaction, manual or automatic, carries it. The hook SHALL make no model call and read no earlier message.

#### Scenario: A Manual Compaction

- **WHEN** the person runs `/compact`
- **THEN** the compaction instructions hold the keep line

#### Scenario: An Automatic Compaction

- **WHEN** the session compacts on its own
- **THEN** the compaction instructions hold the keep line, and no model call is made for it

## REMOVED Requirements

### Requirement: Constraints Come From the Person's Own Words

**Reason**: The ledger made a Decider call on every prompt, so `useConstraintPin` is deleted.

**Migration**: The classic `PreCompact` hook of "Compaction Keeps the Person's Corrections" keeps the person's corrections, refusals, and consents through compaction.

### Requirement: The Ledger Rides Each Prompt

**Reason**: No ledger is left to carry, because `useConstraintPin` is deleted.

**Migration**: The classic `PreCompact` hook of "Compaction Keeps the Person's Corrections" carries the keep line into each compaction.

### Requirement: Runtime Enforcement

**Reason**: The ledger denied tool calls on a model's reading of old messages, so its `tool.check` enforcement is deleted.

**Migration**: Claude Code's permission dialog, and the `permissions` and `autoMode` settings that setup writes, judge each call.

### Requirement: A No-Questions Constraint Holds the Ask Tools

**Reason**: `useAskFix` and the ledger's `AskUserQuestion` denial are deleted, because they denied a tool the model reaches only for facts the person holds.

**Migration**: None is needed. `AskUserQuestion` runs as Claude Code ships it.

### Requirement: Each Constraint Quotes the Person

**Reason**: No ledger entry is left to quote the person, because `useConstraintPin` is deleted.

**Migration**: The classic `PreCompact` hook of "Compaction Keeps the Person's Corrections" asks the compaction to keep the person's own words.

### Requirement: A Resumed Session Waits for Its Ledger

**Reason**: No ledger is left to wait for, because `useConstraintPin` is deleted.

**Migration**: None is needed.
