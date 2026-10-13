# Spec store

## ADDED

### Requirement: Torn JSONL line
The spec store SHALL read an events log whose last line is torn, and SHALL report the torn line with its file and line number, and this changes the behavior that `CHANGELOG.md:151` documents, where one line that is not JSON makes the reader throw.

#### Scenario: Torn last line
- **WHEN** `events.jsonl` ends with a line that is not complete JSON
- **THEN** the reader returns each earlier event and reports the torn line, and `dotclaude-spec validate` names the file and the line

#### Scenario: Torn line that is no longer last
- **WHEN** a `lane` command appends a new event after a torn last line (the append puts a line end first, `store.ts:79`)
- **THEN** the torn line stays reported as a middle line and the new event is read
