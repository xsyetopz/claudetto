# Spec Delta

## MODIFIED Requirements

### Requirement: Bounded Loop

The loop SHALL stop blocking after a fixed number of blocks in a row with no change, so it cannot spin.

#### Scenario: No Progress

- **WHEN** the same block repeats the fixed number of times with no file change
- **THEN** the stop goes through with a note

## REMOVED Requirements

### Requirement: Goal Command

**Reason**: The built-in `/goal` does the job. claudetto's version read its text as a shell command, so a condition such as `release-0-2-0` could never pass. Its start prompt also stayed queued after `/goal clear`.
**Migration**: Use the built-in `/goal <condition>`. To require a check, name it in the condition, such as `/goal just check exits 0`.

### Requirement: Root Agent Stops a Goal

**Reason**: This requirement served only claudetto's `/goal`, which is removed.
**Migration**: Use `/goal clear` to drop a built-in goal.
