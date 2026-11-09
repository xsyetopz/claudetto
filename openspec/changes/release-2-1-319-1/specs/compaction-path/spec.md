## ADDED Requirements

### Requirement: The Handover Threshold Comes from a Four-Arm Probe

The default of `handoverThresholdTokens` SHALL change only when a probe of four arms, each run three times on one scripted 40-turn task, shows an arm cheaper than the built-in path with recall no worse. Each run SHALL record cache read, cache write by TTL, and output once per `requestId`, and SHALL score recall with 10 questions on early decisions.

#### Scenario: The Four Arms

- **WHEN** the probe is set up
- **THEN** its arms are: never compact, with a handoff and a clear at each task boundary; a forked handover at 35,000, 45,000, and 53,000 tokens; the built-in compaction near 53,000 tokens; and two built-in compactions at 40,000 tokens followed by a handover at 45,000, all inside the 25,000 to 65,000 tokens that the 40 real turns span
- **AND** each run records the summarizer request and the first three requests after each event

#### Scenario: Probe Not Run

- **WHEN** no probe result is recorded under `docs/`
- **THEN** `handoverThresholdTokens` keeps its default of the smaller of 400,000 and half the window

#### Scenario: A Cheaper Arm with Equal Recall

- **WHEN** a forked handover costs less than the built-in arm in all three runs and loses no recall question the built-in arm keeps
- **THEN** the default moves to that threshold and the result is recorded with its rows

#### Scenario: Paid Runs

- **WHEN** a probe run would call the real API
- **THEN** it waits for the person's approval, per `AGENTS.md:9`

### Requirement: The Summarizer's Cache Write Is Measured

Before the probe is costed, a run against a fake Messages API with `--debug-file` SHALL record whether the built-in summarizer request carries `cache_control`, and with which TTL. This settles the conflict between `skipCacheWrite:true` in the 2.1.319 compaction fork and the 5m write that `ISSUES-2026-11-09-1422.md` 2026-11-02 item 8 records.

#### Scenario: Fake API Run

- **WHEN** `/compact` runs against the fake API
- **THEN** the recorded request body shows whether `cache_control` is present and its `ttl`, and the result is recorded next to item 8
