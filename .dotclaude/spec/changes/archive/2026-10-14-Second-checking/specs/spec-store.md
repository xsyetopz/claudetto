# Spec store

## ADDED

### Requirement: Torn JSONL line

The spec store SHALL read an events log whose last line is torn, and SHALL report the torn line with its file and line number.
A torn line is a last line with no line end that is not JSON.
A line that is not JSON and is not the last line still stops the reader, as `CHANGELOG.md:151` documents.

#### Scenario: Torn last line

- **WHEN** `events.jsonl` ends with a line that has no line end and is not complete JSON
- **THEN** the reader returns each earlier event, and `dotclaude-spec validate` names the file and the line of the torn line

#### Scenario: Append after a torn last line

- **WHEN** a `lane` command appends a new event to a log whose last line is torn
- **THEN** the append removes the torn line first, and the log holds each earlier event and the new event

#### Scenario: Last line with no line end that is JSON

- **WHEN** the last line of `events.jsonl` is complete JSON with no line end
- **THEN** the reader keeps the event, and the append adds a line end before the new event
