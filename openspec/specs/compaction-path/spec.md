# compaction-path Specification

## Purpose
The path that keeps context across a long session is chosen by measured cost and quality, not by opinion. The default is the built-in path with the handoff as a safety net.

## Requirements

### Requirement: Default Path

The system SHALL use the built-in compaction for every compaction.

#### Scenario: No Probe Yet

- **WHEN** a compaction starts
- **THEN** the compaction path is the built-in one

#### Scenario: No Option Offers the Path

- **WHEN** the plugin's `userConfig` is read for a key that chooses the compaction path
- **THEN** there is none: the `compaction` option that offered `auto`, `built-in`, and `code` stays deleted, together with the `pathOf` that resolved it, and `handoverThresholdTokens` is deleted with the handover. `cheapSummary` and `cheapSummaryEnabled` are gone from `plugin.json`, and no summary by another model exists
- **AND** the test is `tools/manifest.test.ts`, "no plugin option chooses the compaction path or a summary model", a `bun test` file because a lab file cannot read `plugin.json`

#### Scenario: The Code Path Is Offered Again

- **WHEN** a verdict line under `docs/` no longer says "No winner"
- **THEN** that measured winner is the signal to build the code path and declare an option for it

#### Scenario: A Cost Claim Arrives from Outside

- **WHEN** a source outside this repository states that the built-in compaction is expensive
- **THEN** the default changes only on rows of this login, and the claim is recorded in `references.md` with its method and its sample. Four such sources were read on 2026-10-28 and none changed a value, because the only one with a real sample fits its band on a window near 1M against the 300,000 this project sets, and because the figure most often quoted, about `$3.00` per compaction, appears in no source read
- **AND** one of the four did change what a value cites without changing the value: the Anthropic page `about-claude/models/optimizing-for-cost-and-intelligence` is the first vendor source for the 90,000 Haiku trigger, which `tier-profiles` had recorded as having none and now cites at its "Haiku Trigger" scenario

### Requirement: The Summarizer's Cache Write Is Measured

Before the probe is costed, a run against a fake Messages API with `--debug-file` SHALL record whether the built-in summarizer request carries `cache_control`, and with which TTL. This settles the conflict between `skipCacheWrite:true` in the 2.1.319 compaction fork and the 5m write that `ISSUES-2026-11-09-1422.md` 2026-11-02 item 8 records.

#### Scenario: Fake API Run

- **WHEN** `/compact` runs against the fake API
- **THEN** the recorded request body shows whether `cache_control` is present and its `ttl`, and the result is recorded next to item 8

### Requirement: A Compaction Carries the Person's Words

The `session.compact` hook SHALL add the instruction "Keep the person's corrections, refusals, and consents word for word." to every compaction, after any instruction the compaction already carries, and SHALL add the stored constraints after it when the constraint ledger holds any. Setup SHALL write `autoCompactWindow`, which sets when the built-in compaction runs.

#### Scenario: A Compaction With an Empty Ledger

- **WHEN** a compaction starts and the ledger holds no constraint
- **THEN** the instruction reaching the next hook is the sentence above and no more
- **AND** the lab test is `pin.test.ts`, "a compaction is told to keep the person's corrections, refusals, and consents word for word"

#### Scenario: A Compaction With a Stored Constraint

- **WHEN** a compaction starts and the ledger holds "Nothing should change on disk."
- **THEN** the instruction holds the sentence above and then the line `- Nothing should change on disk.`
- **AND** the lab test is `pin.test.ts`, "a compaction names each stored constraint after the standing instruction"

#### Scenario: The Instruction Reaches the Summarizer

- **WHEN** a plugin's `session.compact` hook calls `next({ ...e, instructions })` and `/compact` runs against a stand-in Messages API
- **THEN** the summarizer request ends with `Additional Instructions:` and the text, and a hook that fails leaves the text out (P190)
