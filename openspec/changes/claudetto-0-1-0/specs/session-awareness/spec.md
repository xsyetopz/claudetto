# Spec Delta: `session-awareness`

## Purpose

Tells the user and Claude what a session costs and how much of the subscription or API budget is left, from the data that Claude Code already has.

## ADDED Requirements

### Requirement: Start cost

The start-cost command SHALL report the tokens of the first request of a session, by source: system prompt, tools, skills, agents, and memory files.

#### Scenario: Start cost of a session

- **WHEN** the user runs the start-cost command on a transcript
- **THEN** it gives the token count of each source and the total

### Requirement: Usage of a run

The usage command SHALL report the model calls, the tokens that each call reads again from the cache, the cost, and the skills that a period did not use.
Each count SHALL have its own label.

#### Scenario: A transcript with an unknown model id

- **WHEN** a transcript has a model id that the parser does not know
- **THEN** the report marks the model as unknown and does not set its token counts to zero

#### Scenario: A transcript with no data

- **WHEN** the transcript has no usage data
- **THEN** the command says that no data is present, and does not report a failed bound

### Requirement: Subscription and rate limits

The add-on SHALL show the rate-limit state from the status line input and SHALL tell Claude when the weekly use is near its limit.

#### Scenario: Near the weekly limit

- **WHEN** the weekly use passes the warning bound
- **THEN** Claude gets one note with the weekly use

### Requirement: Session identity

When the managed `appendPlugins` list names the add-on, it SHALL use `session.identity` to name the account in the reports.
Otherwise `session.identity` gives a `deny`, and the reports SHALL work with no account name.

#### Scenario: Plugin install

- **WHEN** the add-on is installed as a plugin
- **THEN** the reports work and name no account

### Requirement: Gating hooks do not throw

Each gating hook of the add-on SHALL catch its errors and let the session go on.

#### Scenario: A hook error

- **WHEN** a gating hook of the add-on throws
- **THEN** the session goes on, and the log holds the error

### Requirement: Version record

The add-on SHALL record the Claude Code version and the plugin version of each session in its own data, and SHALL NOT put a raw JSON notice in the transcript.

#### Scenario: Session start

- **WHEN** a session starts
- **THEN** the transcript has no raw JSON stamp, and the usage report names the versions
