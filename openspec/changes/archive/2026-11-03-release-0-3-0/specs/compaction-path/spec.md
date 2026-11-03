## MODIFIED Requirements

### Requirement: Default Path

The system SHALL answer a compaction with a handover when the requirements "A Handoff Reply Replaces the Compaction" or "A Large Context Forks for a Handoff at Idle" apply, and SHALL use the built-in compaction for every other compaction.

#### Scenario: No Probe Yet

- **WHEN** a compaction starts and claudetto did not start it for a handover
- **THEN** the compaction path is the built-in one

#### Scenario: No Option Offers the Path

- **WHEN** the plugin's `userConfig` is read for a key that chooses the compaction path
- **THEN** there is none: the `compaction` option that offered `auto`, `built-in`, and `code` stays deleted, together with the `pathOf` that resolved it
- **AND** the options near this path are `cheapSummary`, which chooses the summarizer's model of the built-in path, and `handoverTokens`, which sets the context size at which a fork asks for a handoff; neither turns the built-in path off

#### Scenario: The Code Path Is Offered Again

- **WHEN** a verdict line under `docs/` no longer says "No winner"
- **THEN** that measured winner is the signal to build the code path and declare an option for it

#### Scenario: A Cost Claim Arrives from Outside

- **WHEN** a source outside this repository states that the built-in compaction is expensive
- **THEN** the default changes only on rows of this login, and the claim is recorded in `references.md` with its method and its sample. Four such sources were read on 2026-10-28 and none changed a value, because the only one with a real sample fits its band on a window near 1M against the 300,000 this project sets, and because the figure most often quoted, about `$3.00` per compaction, appears in no source read
- **AND** one of the four did change what a value cites without changing the value: the Anthropic page `about-claude/models/optimizing-for-cost-and-intelligence` is the first vendor source for the 90,000 Haiku trigger, which `tier-profiles` had recorded as having none and now cites at its "Haiku Trigger" scenario

## REMOVED Requirements

### Requirement: Paid Runs Need Approval

**Reason**: Paid runs in this repository no longer wait for approval; the cost is reported after the run. Two runs on 2026-11-02 showed the approval did not bound the cost: one cost 3.4 times its estimate, and probe rounds took 25.5% of the week's main-thread tokens.

**Migration**: The requirement "A Paid Run Is Counted Free First" bounds a paid run by a token count taken on the fake Messages API before it runs.

## ADDED Requirements

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

When a main turn ends with a reply that is not a handoff and the context is at the option `handoverTokens` or more, claudetto SHALL ask one fork of the session for a handoff and hand over to it. The default size SHALL be the smaller of 400,000 tokens and half the model's window.

#### Scenario: At the Size

- **WHEN** a main turn ends with a context of 400,000 tokens on a 1M window
- **THEN** one fork is asked for a handoff, and its handoff replaces the compaction

#### Scenario: Small Window

- **WHEN** the window is 200,000 tokens and the context is 99,999
- **THEN** no fork is asked, and at 100,000 one is

#### Scenario: Option Set

- **WHEN** `handoverTokens` is 600,000 and the context is 450,000
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

### Requirement: The Handover Keeps the First Request's Bytes

The request after a handover SHALL repeat the session's first request through its first two messages byte for byte, with the same system prompt and tools, so the cached prefix can be read. The size of what it writes SHALL be recorded from a real run until the cause of the real-API miss is known.

#### Scenario: Prefix Compared on the Fake API

- **WHEN** a handover runs on the fake Messages API
- **THEN** `system`, `tools`, and messages 0 and 1 of the next request match the first request apart from `cache_control`

#### Scenario: Real-API Miss Tested

- **WHEN** a real run hands over right after the session's first request, with no tool call between
- **THEN** its cache read and write of messages 0 and 1 are recorded in `ISSUES.md`, which confirms or rules out that the entry is lost after a longer one is written

### Requirement: A Paid Run Is Counted Free First

Before a paid probe, the same requests SHALL be built on the fake Messages API, their tokens counted, and their prefixes compared with the request meant to warm the cache. A paid run SHALL NOT start on an estimate that the count exceeds, and its tokens and weekly share SHALL be reported after it.

#### Scenario: Context Larger than the Estimate

- **WHEN** the fake-API build's last body counts 286,000 tokens against an estimate of 150,000
- **THEN** the paid run does not start on the old estimate, and the new count is reported first

#### Scenario: Prefix Breaks before the Paid Run

- **WHEN** a forked or resumed arm's prefix differs from the warm request's prefix on the fake API
- **THEN** the arm is fixed before the paid run, so no paid call misses the cache by setup

#### Scenario: After the Run

- **WHEN** a paid run ends
- **THEN** the report gives its tokens and its share of the weekly limit

### Requirement: A Probe Stops Only Its Own Processes

A probe SHALL stop a process only by the pid its launcher recorded, with `kill <pid>`, and SHALL NOT use `pkill` or `killall` with a pattern.

#### Scenario: Fake API Stopped

- **WHEN** a probe ends and its fake Messages API still runs
- **THEN** the probe runs `kill` with the recorded pid, and no other process of the user ends
