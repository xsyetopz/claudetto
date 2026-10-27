## ADDED Requirements

### Requirement: Line Cap

`minispec validate` SHALL give a WARNING for each `.md` file of a change folder over 300 lines, with the path and the line count.
It SHALL not check `openspec/changes/archive/` (the user, 2026-10-26).

#### Scenario: Long Research File

- **WHEN** `research/notes.md` of an open change has 301 lines
- **THEN** `validate --strict` names the file and its 301 lines, and exits not 0

#### Scenario: Archived File

- **WHEN** an archived change has a file of 700 lines
- **THEN** `validate --all --strict` gives no warning for it

### Requirement: Concise Text Rule

The minispec skills SHALL tell the writer to use the fewest words that keep one exact meaning, with the reason, and SHALL have no ALL CAPS marker (the user, 2026-10-26).

#### Scenario: Skill Text

- **WHEN** a reader opens a minispec skill
- **THEN** it holds the concise-writing rule with its reason, and no word in ALL CAPS that is not a code item or a delta keyword
