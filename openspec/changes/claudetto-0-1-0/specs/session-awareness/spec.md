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
- **THEN** the command says that no data is present, with its own exit status 2, and does not report a failed bound

#### Scenario: A text bound with no snapshot

- **WHEN** the user gives `--text-max` and the transcript has no `prompt_snapshot` record
- **THEN** the command fails with exit status 1, and says that the check did not run

### Requirement: Subscription and rate limits

Claude Code shows the rate-limit state, so the add-on SHALL NOT draw it again.
The add-on SHALL tell Claude once per session when the seven-day use reaches 80 percent, from the windows of `session.measure`.

#### Scenario: Near the weekly limit

- **WHEN** the seven-day use reaches the warning bound, 80 percent
- **THEN** the main agent gets one note with the weekly use, after the result of its next tool call

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

The usage report SHALL name the Claude Code versions that the transcript records, and its own plugin version.
The `session.start` hook SHALL keep the plugin version of each session in `$.store`, for at most 500 sessions.
The command `/claudetto-sessions:usage` SHALL give that record to the report, and the report SHALL count the sessions of the period by plugin version.
The add-on SHALL NOT put a raw JSON notice in the transcript, and SHALL NOT keep a record that nothing reads.

#### Scenario: Session start

- **WHEN** a session starts
- **THEN** the transcript has no raw JSON stamp, and the usage report names the versions

#### Scenario: Plugin versions of the sessions

- **WHEN** two sessions of the period started with plugin version `0.1.0`, and one started before the record had it
- **THEN** the usage report gives `0.1.0 2, not recorded 1`
