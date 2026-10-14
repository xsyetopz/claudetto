# Usage parse

## ADDED

### Requirement: Null JSONL line

The usage parser of `dotclaude-sessions` SHALL skip a line that is JSON `null`, as `transcript.ts` does.

#### Scenario: Null line

- **WHEN** a transcript line is `null`
- **THEN** the parser skips the line and reads the next line

### Requirement: Same rule as the transcript reader

The usage parser SHALL apply the rule of `transcript.ts:82-89` to a non-object line, so the two readers agree on one file.

#### Scenario: Same file in both readers

- **WHEN** both readers read one transcript that holds a `null` line, a number line, and an array line
- **THEN** both give the same entries
