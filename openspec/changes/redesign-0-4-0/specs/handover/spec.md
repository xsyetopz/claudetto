## MODIFIED Requirements

### Requirement: Three Triggers

A handover SHALL start on one of three triggers.
First, the context passes 150k tokens, from the bounds file of the `session` module.
Second, the session was idle longer than the prompt cache TTL, checked at the next `prompt.submit`, and the user says yes to the offer.
Third, the open change moves to its next task group, or the session runs longer than 8 hours, from the same file.
The first and third triggers start with no question.

#### Scenario: Context Bound

- **WHEN** a turn ends and the context is over the bound
- **THEN** the handover starts

#### Scenario: Cold Cache, Yes

- **WHEN** the session was idle longer than the cache TTL, the user sends a prompt, and the user says yes to the handover note
- **THEN** the session resumes on the handoff, and the held prompt runs after the resume

#### Scenario: Cold Cache, No

- **WHEN** the session was idle longer than the cache TTL and the user says no to the handover note
- **THEN** the prompt runs in the same session with no handover

#### Scenario: Next Task Group

- **WHEN** the open change moves from group 3 to group 4 at the end of a turn
- **THEN** the handover starts

### Requirement: Path by Measure

A table in the bounds file of the `session` module SHALL map each case, a trigger and a context size, to `handover`, `compact`, or `handoff-then-compact`, and the code SHALL pick the path from it.
A path SHALL win a case when paired runs show that it costs less and the next task passes as well or better.

#### Scenario: Table Names Handover

- **WHEN** the table maps the case "context bound, 200k" to `handover`
- **THEN** the code runs a handover for that case

#### Scenario: Table Names Compact

- **WHEN** the table maps a case to `compact`
- **THEN** the code runs `/compact` with the handover text as its instructions, and writes no handoff file

#### Scenario: Table Names Both

- **WHEN** the table maps a case to `handoff-then-compact`
- **THEN** the code writes the handoff file, then runs a compaction

#### Scenario: Paired Runs Decide

- **WHEN** paired runs show that `compact` costs less for a case and the next task passes as well
- **THEN** the table maps that case to `compact`
