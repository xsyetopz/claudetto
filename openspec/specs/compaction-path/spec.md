# compaction-path Specification

## Purpose
The path that keeps context across a long session is chosen by measured cost and quality, not by opinion. The default is the built-in path with the handoff as a safety net.

## Requirements

### Requirement: Default Path

The system SHALL answer a compaction with a handover when the requirements "A Handoff Reply Replaces the Compaction" or "A Large Context Forks for a Handoff at Idle" apply, and SHALL use the built-in compaction for every other compaction.

#### Scenario: No Probe Yet

- **WHEN** a compaction starts and claudetto did not start it for a handover
- **THEN** the compaction path is the built-in one

#### Scenario: No Option Offers the Path

- **WHEN** the plugin's `userConfig` is read for a key that chooses the compaction path
- **THEN** there is none: the `compaction` option that offered `auto`, `built-in`, and `code` stays deleted, together with the `pathOf` that resolved it
- **AND** the one option near this path is `handoverThresholdTokens`, which sets the context size at which a fork asks for a handoff; it does not turn the built-in path off. `cheapSummary` and `cheapSummaryEnabled` are gone from `plugin.json`, and no summary by another model exists
- **AND** the test is `tools/manifest.test.ts`, "no plugin option chooses the compaction path or a summary model", a `bun test` file because a lab file cannot read `plugin.json`

#### Scenario: The Code Path Is Offered Again

- **WHEN** a verdict line under `docs/` no longer says "No winner"
- **THEN** that measured winner is the signal to build the code path and declare an option for it

#### Scenario: A Cost Claim Arrives from Outside

- **WHEN** a source outside this repository states that the built-in compaction is expensive
- **THEN** the default changes only on rows of this login, and the claim is recorded in `references.md` with its method and its sample. Four such sources were read on 2026-10-28 and none changed a value, because the only one with a real sample fits its band on a window near 1M against the 300,000 this project sets, and because the figure most often quoted, about `$3.00` per compaction, appears in no source read
- **AND** one of the four did change what a value cites without changing the value: the Anthropic page `about-claude/models/optimizing-for-cost-and-intelligence` is the first vendor source for the 90,000 Haiku trigger, which `tier-profiles` had recorded as having none and now cites at its "Haiku Trigger" scenario

### Requirement: A Handoff Reply Replaces the Compaction

When a main-loop turn ends with a reply whose first line is `# Handoff`, claudetto SHALL save the reply under `.claude/claudetto/handoffs/`, compact the conversation to the first message, one assistant line, and the handoff, with no summarizer request and no restored file, and SHALL then send the prompt that continues from the handoff.

#### Scenario: Handoff Reply

- **WHEN** a main-loop turn ends with a reply that starts with `# Handoff` and a newline
- **THEN** the file is saved, the next request holds the first message, the assistant line, and the handoff, no summarizer request is sent, and the continue prompt goes in

#### Scenario: Not a Main Handoff Reply

- **WHEN** the reply comes from a subagent, the turn was interrupted, or the reply lacks the title
- **THEN** no compaction starts

#### Scenario: The Compaction Is Not Answered

- **WHEN** the `/compact` that claudetto runs fails or runs no compaction
- **THEN** no prompt is sent, the user sees one line, and the next compaction goes to the engine

#### Scenario: Typed Compaction Afterwards

- **WHEN** the user types `/compact` after a handover
- **THEN** the engine answers it

### Requirement: A Large Context Forks for a Handoff at Idle

When a main turn ends with a reply that is not a handoff and the context is at the option `handoverThresholdTokens` or more, claudetto SHALL ask one fork of the session for a handoff and hand over to it. The default size SHALL be the smaller of 400,000 tokens and half the model's window.

#### Scenario: At the Size

- **WHEN** a main turn ends with a context of 400,000 tokens on a 1M window
- **THEN** one fork is asked for a handoff, and its handoff replaces the compaction

#### Scenario: Small Window

- **WHEN** the window is 200,000 tokens and the context is 99,999
- **THEN** no fork is asked, and at 100,000 one is

#### Scenario: Option Set

- **WHEN** `handoverThresholdTokens` is 600,000 and the context is 450,000
- **THEN** no fork is asked

#### Scenario: Subagent Turn

- **WHEN** a subagent's turn ends at a large context
- **THEN** no fork is asked

### Requirement: A Fork Handover Waits for the User

A handover from a fork SHALL compact to the handoff and send no prompt, because the turn already answered the user and the handoff's next step waits for the user.

#### Scenario: Fork Handover

- **WHEN** a fork's handoff replaces the compaction
- **THEN** no prompt is submitted after the compaction

### Requirement: A Declined Fork Is Not Asked Again

When a fork returns no handoff, claudetto SHALL show the user one line and ask no further fork until the next main compaction.

#### Scenario: Fork Replies without the Title

- **WHEN** a fork replies without `# Handoff`, and two more turns end over the size
- **THEN** one fork was asked in all, and after the engine compacts, the next turn over the size asks one again

### Requirement: A Handover Does Not Loop

When the turn after a handover ends with the context still at the size, claudetto SHALL ask no fork, SHALL show the user one line, and SHALL leave the context to the engine's compaction.

#### Scenario: First Message Larger than the Size

- **WHEN** the turn after a handover ends at 450,000 tokens with a size of 400,000
- **THEN** no second fork is asked and the user sees one line

### Requirement: No Mid-Turn Fork

A compaction that the engine starts mid-turn SHALL go to the engine, because a fork mid-turn lags one tool pair behind and sends the newest tool result uncached.

#### Scenario: Automatic Compaction Mid-Turn

- **WHEN** the engine starts an automatic compaction while a turn runs
- **THEN** claudetto asks no fork and the built-in compaction runs

### Requirement: The Compaction Result of a Handover Keeps the First Message

The compaction result of a handover SHALL keep the session's first message ahead of the handoff, so the cached prefix up to that message can be read.

#### Scenario: First Message Kept

- **WHEN** a handover replaces a compaction of a session whose first message is `first`
- **THEN** the result holds the first message, an assistant line, and the handoff, in that order (`plugins/claudetto/hooks/handoff/handover.test.ts`, "the compaction keeps the first message, an assistant line, and the handoff")

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
