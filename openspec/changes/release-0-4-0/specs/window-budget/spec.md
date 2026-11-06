## MODIFIED Requirements

### Requirement: The Weekly Share Slows the Session

When the seven-day share used is at or above 90%, the prompt hook SHALL state the share as a fact line, and the root prompt SHALL carry the instruction to start no subagent fan-out and no paid eval run, and to report the remaining share with each reply that spent more than one percent of it.

#### Scenario: Share at 99%

- **WHEN** the prompt hook reads a seven-day share of 99%
- **THEN** its line names the share and holds no instruction
- **AND** the root prompt tells the session to start no fan-out or paid run

## REMOVED Requirements

### Requirement: Record Window Change per Turn

**Reason**: 0.4.0 removes the window row store. Its rows have no shipped reader, because `tools/window-report.ts` is unshipped (`feature-map.md`, "Window rows"; `design.md`, "Features removed when a native setting replaces them").
**Migration**: None.

### Requirement: Window Rows Are Recorded

**Reason**: 0.4.0 removes the window row store (`feature-map.md`, "Window rows").
**Migration**: None.

### Requirement: Window Rows Record the Cache TTL

**Reason**: 0.4.0 removes the window row store, so no row holds a cache TTL (`feature-map.md`, "Window rows").
**Migration**: None.

### Requirement: A Stop Loop with No Progress Is Ended

**Reason**: The stall rule changes and its owner is run-limits: the first Stop block after a stretch with no file change ends the turn (`feature-map.md`, "Stall at Stop"; `tasks.md` 5.16).
**Migration**: See "A Stop Loop with No Progress Ends the Turn" in `run-limits`.

### Requirement: Report from Many Turns

**Reason**: The report read the window rows, which 0.4.0 removes with no shipped reader (`feature-map.md`, "Window rows"; `tools/window-report.ts` is unshipped).
**Migration**: None.

### Requirement: Report the Weights Only When Measured

**Reason**: Same as "Report from Many Turns": no rows remain to weigh (`feature-map.md`, "Window rows").
**Migration**: None.

### Requirement: No Claim without Rows

**Reason**: No rows remain (`feature-map.md`, "Window rows"). The setup report's promise of no plan share stays in `tier-profiles`, "No Promise of Plan Share".
**Migration**: None.

### Requirement: The Share Rate Matches the Meter

**Reason**: the share-rate script lived in the in-repo probing tool, which task 17.13 removed from this repo, and it was never a plugin feature (`feature-map.md`, "Repo tooling", row `claudekit/`).
**Migration**: None.

### Requirement: The Classify Block's Spend Is Counted

**Reason**: The spend write goes with the window rows (`feature-map.md`, "Window rows"), and the `classify` block is not carried (`feature-map.md`, "Decisions of the user, 2026-11-05", task 3.1; `tasks.md` 5.29).
**Migration**: None.

### Requirement: The Window Report Prices Each Cache TTL

**Reason**: The report and the rows it priced are removed (`feature-map.md`, "Window rows").
**Migration**: None.
