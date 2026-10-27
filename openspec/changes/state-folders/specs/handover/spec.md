## MODIFIED Requirements

### Requirement: Handoff Location

Each handoff SHALL go to `.claude/claudetto/handoffs/`.
A change folder SHALL get no `handoff.md`.

#### Scenario: Open Change

- **WHEN** a handover runs while the change `release-0-3-0-alpha-2` is open
- **THEN** the file is in `.claude/claudetto/handoffs/`, and `openspec/changes/release-0-3-0-alpha-2/` gets no `handoff.md`
