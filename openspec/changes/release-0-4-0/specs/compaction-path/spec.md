## MODIFIED Requirements

### Requirement: Default Path

The system SHALL answer a compaction with a handover when the requirements "A Handoff Reply Replaces the Compaction" or "A Large Context Forks for a Handoff at Idle" apply, and SHALL use the built-in compaction for every other compaction.

#### Scenario: No Probe Yet

- **WHEN** a compaction starts and claudetto did not start it for a handover
- **THEN** the compaction path is the built-in one

#### Scenario: No Option Offers the Path

- **WHEN** the plugin's `userConfig` is read for a key that chooses the compaction path
- **THEN** there is none: the `compaction` option that offered `auto`, `built-in`, and `code` stays deleted, together with the `pathOf` that resolved it
- **AND** the one option near this path is `handoverThresholdTokens`, which sets the context size at which a fork asks for a handoff; it does not turn the built-in path off, and the cheap summary has no option (`cheapSummary` and `cheapSummaryEnabled` are gone from `plugin.json`)

#### Scenario: The Code Path Is Offered Again

- **WHEN** a verdict line under `docs/` no longer says "No winner"
- **THEN** that measured winner is the signal to build the code path and declare an option for it

#### Scenario: A Cost Claim Arrives from Outside

- **WHEN** a source outside this repository states that the built-in compaction is expensive
- **THEN** the default changes only on rows of this login, and the claim is recorded in `references.md` with its method and its sample. Four such sources were read on 2026-10-28 and none changed a value, because the only one with a real sample fits its band on a window near 1M against the 300,000 this project sets, and because the figure most often quoted, about `$3.00` per compaction, appears in no source read
- **AND** one of the four did change what a value cites without changing the value: the Anthropic page `about-claude/models/optimizing-for-cost-and-intelligence` is the first vendor source for the 90,000 Haiku trigger, which `tier-profiles` had recorded as having none and now cites at its "Haiku Trigger" scenario

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
- **THEN** it is `total_cost_usd` of that fork's own run, which the program bills per model at that model's own input, cache-write, and cache-read prices, so a model switch is counted without the probe pricing any token itself, the `total_cost_usd` field of the run's stream-json `result` event
- **AND** no harness-side price table exists to drift against the published prices, which is why the requirement is met by reading the billed figure rather than by recomputing it
