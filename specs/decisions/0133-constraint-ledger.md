---
status: superseded by ADR-0075
date: recorded in openspec/specs/constraint-ledger/spec.md:8 (day of decision not recorded)
---

# Constraint Ledger

## Context and Problem Statement

Haiku extracted the user's standing constraints (read-only, no-commit, no-push, only-files, no-questions) from their messages off the reply path (hook median 15.7 ms, p90 36.7 ms against 2.2 s and 3.3 s synchronous). The ledger rode each later prompt, was kept word for word through compaction, and `tool.check` waited for extraction then denied breaks. Measured drift 39/48 to 48/48 (Fisher p=0.003), keep cases 16/16, read-only changed no file 8/8 against 1/8; the extraction prompt had to exclude tasks, files to change, and claims about code (a task sentence became a false only-files rule; 12/16 against 16/16).

## Considered Options

* Keep the ledger.
* Remove it and rely on the Claude Code permission dialog plus `permissions` and `autoMode` judge calls.

## Decision Outcome

Chosen: Superseded: the 2-1-323 design removed the constraint ledger (`useConstraintPin` and `useAskFix` deleted) and the user decision keeps it out. A per-prompt "Constraints the user stated earlier" injection (about 150 hits) goes too.

### Consequences

Without a ledger the agent forgets "don't touch X" across turns and compaction; the design accepts that.

### Confirmation

`git grep useConstraintPin` finds nothing under `plugins/`.

## More Information

Basis: measured, then removed. Status: superseded (`plugins/claudetto/hooks/features/memory/hold.ts` "ledger" is an unrelated call ledger).

Source: openspec/specs/constraint-ledger/spec.md:8.
