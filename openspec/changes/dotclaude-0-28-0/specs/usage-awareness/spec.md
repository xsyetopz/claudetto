# Spec Delta

## Purpose

States that the usage-awareness capability is removed from 0.28.0.
The first plan gave the main session one-time notes at context and usage levels, a handoff across `/clear`, and a record of a hard stop (design D32).
Each part kept state: a usage state file written by the status line, a marker file for each session, and carry and stop files in `${CLAUDE_PLUGIN_DATA}`.
Rule D35 forbids that state, so the parts are deleted with their tests.
The stateless context note remains, and it is in the `context-bound` spec.

## ADDED Requirements

### Requirement: Usage-awareness capability removed

dotclaude SHALL NOT read or write a usage state file, a level marker, a handoff carry file, or a stop record.
dotclaude SHALL NOT give a note for the 5-hour or 7-day usage window, because only the status line input carries `rate_limits`.
dotclaude SHALL NOT register a `SessionEnd`, `SessionStart`, or `StopFailure` hook for a handoff or a stop record.

#### Scenario: No state files

- **WHEN** a test searches `plugins/dotclaude/` for `usage-state`, `CLAUDE_PLUGIN_DATA`, and a marker file path
- **THEN** it finds none

#### Scenario: No lifecycle hooks

- **WHEN** a test reads `plugins/dotclaude/hooks/hooks.json`
- **THEN** it has no `SessionEnd` or `StopFailure` entry for a handoff or a stop record
