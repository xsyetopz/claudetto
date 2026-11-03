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
- **AND** the options near this path are `cheapSummary`, which chooses the summarizer's model of the built-in path, and `handoverTokens`, which sets the context size at which a fork asks for a handoff; neither turns the built-in path off

#### Scenario: The Code Path Is Offered Again

- **WHEN** a verdict line under `docs/` no longer says "No winner"
- **THEN** that measured winner is the signal to build the code path and declare an option for it

#### Scenario: A Cost Claim Arrives from Outside

- **WHEN** a source outside this repository states that the built-in compaction is expensive
- **THEN** the default changes only on rows of this login, and the claim is recorded in `references.md` with its method and its sample. Four such sources were read on 2026-10-28 and none changed a value, because the only one with a real sample fits its band on a window near 1M against the 300,000 this project sets, and because the figure most often quoted, about `$3.00` per compaction, appears in no source read
- **AND** one of the four did change what a value cites without changing the value: the Anthropic page `about-claude/models/optimizing-for-cost-and-intelligence` is the first vendor source for the 90,000 Haiku trigger, which `tier-profiles` had recorded as having none and now cites at its "Haiku Trigger" scenario

### Requirement: Decision Rule

The system SHALL switch to another path only when the arm shows a lower mean cost per fork than the built-in arm at each size and no worse result on each bar: constraints broken, files re-read, work redone, and the next task done. It SHALL also show no cache problem: no larger first cache write and no lower cache read share in either follow-up.

#### Scenario: A Bar Is Read

- **WHEN** a report scores an arm against the bars
- **THEN** it takes each definition from the requirement above, which names no file of a probe harness, so the rule outlives the harness that produced it

#### Scenario: Cheaper but Worse

- **WHEN** an arm costs less and rereads more files than the built-in arm
- **THEN** the path does not change

#### Scenario: A Bar That Tests Nothing

- **WHEN** both arms score 0 on the next task at a size
- **THEN** that bar counts as a gap and not a pass, and the path does not change

### Requirement: Model Cost Is Counted

The probe SHALL count the uncached input of a summarizer call that uses another model, because a model switch rebuilds the cache and a call with its own system prompt reads no part of the session's prefix. Both are verified in the `clawdipedia` routes `extend/mod-api/types/model` and `how-it-works/request-and-cache`, and `architecture.md` holds the quotes.

#### Scenario: Cheap-Model Arm

- **WHEN** an arm summarizes with Haiku 5.5, which gets no cache hit
- **THEN** its cost includes the full input price of the whole context at the tier of the prompt length

#### Scenario: Fork of the Same Model

- **WHEN** a compaction forks the session on the same model while the cache entry is live
- **THEN** its input counts at the cache-hit price, and a `cache_read_input_tokens` near zero counts as the whole prefix paid in full

#### Scenario: Claims Not Yet Verified

- **WHEN** either of the first two claims is unconfirmed for the version under test
- **THEN** the report marks the cost of the arm "cache claim unverified" and the path does not change on it

#### Scenario: Where the Count Comes From

- **WHEN** the `cost` bar of a fork is read
- **THEN** it is `total_cost_usd` of that fork's own run, which the program bills per model at that model's own input, cache-write, and cache-read prices, so a model switch is counted without the probe pricing any token itself (`claudekit/probe/round/result.ts`, the `cost` field)
- **AND** no harness-side price table exists to drift against the published prices, which is why the requirement is met by reading the billed figure rather than by recomputing it

### Requirement: The Summarizer Model Is Named, Not Inherited

The expensive turn of the built-in path is the summarizer request, which the engine bills on the model the session runs. Claudetto SHALL be able to answer `session.compact` with one bounded `$.model.complete` call on a model it names itself, and SHALL ship that handler off until rows price it. The engine's own compaction stays the fallback on every failure, because a compaction that does not happen ends the turn.

The model named is the constant `HAIKU_MODEL` of `src/tiers/tiers.ts` and not a field of the tier row. A row field would offer a choice that nothing decides: the point of the handler is that the summarizer runs on the cheapest model whatever the session runs, and every plan reaches the same one. The row carries the switch alone, `cheapSummary`, which is off in every row.

#### Scenario: The Handler Answers

- **WHEN** the handler answers the compaction with its own summary
- **THEN** it makes exactly one `$.model.complete` call on `HAIKU_MODEL` with the fixed instructions in a `cache: true` block, and `SessionCompacted.usage` is absent, which is how the engine reports that a hook answered rather than core (`clawdipedia` `extend/mod-api/types/session/compact-measure-messages`, read 2026-10-28)

#### Scenario: The Cheap Call Fails

- **WHEN** the call throws, times out, or returns no summary
- **THEN** the handler calls `next(e)` and the engine compacts as it always did, and the failure is logged with `$.ui.log`

#### Scenario: No Rows Price It Yet

- **WHEN** no rows of `window-budget` price a compaction answered this way against one answered by the engine
- **THEN** every tier row leaves `cheapSummary` off, the option default is `off`, and the default stays the built-in path of the requirement "Default Path"

#### Scenario: The Engine's Own Compaction Is Priced

- **WHEN** the cost of an engine-answered compaction is needed, to compare against a handler-answered one
- **THEN** it is read from `$.session.usage()` deltas across the boundary and never from the transcript, because the transcript carries no `usage` record for the summarizer request at all: the summary arrives as a `user` message with `isCompactSummary` of `true` and no `usage` block, and no `assistant` record exists for that turn

#### Scenario: The Saving Is Claimed

- **WHEN** a document states the saving of the cheap summarizer
- **THEN** it cites rows of a real session and not round 9 of the probe, because round 9 made the summary cheap by running `/compact` as its own `claude -p --model claude-haiku-5-5` process (`archive/dev/probe/plan.ts:40-84`), which no live session does, and the cost it measured, 22 percent of a fork at `80k` and 33 percent at `200k`, was billed on `claude-sonnet-5-5` and not on the Opus row of this login

### Requirement: Runs Repeat

Each arm SHALL run more than one fork, and the report SHALL list the cost of each fork.

#### Scenario: One Slow Fork

- **WHEN** the first fork of an arm pays a large cache write
- **THEN** the report shows it apart from the mean

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
