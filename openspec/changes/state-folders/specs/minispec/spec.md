## MODIFIED Requirements

### Requirement: No Handoff in a Change Folder

`minispec` SHALL write no `handoff.md` into a change folder.
Handoffs SHALL go to `.claude/claudetto/handoffs/` (spec `handover`).

#### Scenario: New Change

- **WHEN** the user runs `minispec new change release-x`
- **THEN** the change folder has no `handoff.md`
