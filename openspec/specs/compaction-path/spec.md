# compaction-path Specification

## Purpose
The path that keeps context across a long session is chosen by measured cost and quality, not by opinion. The path is a handoff through a mod-driven compaction; the built-in summarizer runs only for a compaction that finds no handoff file.

## Requirements

### Requirement: Handoff Compaction

The `session.measure` hook SHALL add one notice once context use reaches `HANDOFF_PERCENT` (60), asking for a handoff file at `<CLAUDE_CODE_TMPDIR|TMPDIR|/tmp>/claudetto-handoff-<session id>.md` with goal, done work, open tasks, decisions, the user's corrections word for word, and the next step, then an ended turn. On `turn.complete` of the main loop after the file exists, the plugin SHALL call `$.session.compact()` and catch its rejection. The `session.compact` hook SHALL answer a main-loop compaction that finds the file with that text as the one message (`toolUses: []`) and remove the file; with no file it SHALL call `next(e)`. Auto-compaction stays on, so a compaction at the threshold, in a headless session too, takes the file when it exists. The session folder of Claude Code is not the place for the file, because it exists only after a tool has run.

#### Scenario: The Notice Comes Once for Each Fill

- **WHEN** context use passes 60% and measures again
- **THEN** one notice names the file, and a later measure past 60% adds none until use falls under 60% again
- **AND** the lab test is `handoff.test.ts`, "past the soft threshold one notice names the handoff file, and a second measure adds none"

#### Scenario: The File Is Written

- **WHEN** a turn ends with the file present
- **THEN** `$.session.compact()` runs, the hook answers with the file text as the one message, no summarizer request is made, and the file is removed
- **AND** the evidence is a run of the real plugin on a fake Messages API: the request after the reset carries the file text and not the notice, and no request carries the summarizer prompt (`PostCompact` fired, `PreCompact` did not)

#### Scenario: No File or a Headless Session

- **WHEN** a turn ends before the file exists, or `$.session.compact()` rejects
- **THEN** nothing compacts, the rejection is logged, and the turn ends
- **AND** `$.session.compact()` rejects while a turn runs, so a `-p` session compacts only at the threshold; with `autoCompactEnabled: false` it answers "Prompt is too long" at overflow (measured), so the setting stays on

#### Scenario: Cost on the Fake API

- **WHEN** the handoff and the built-in call are compared on one conversation
- **THEN** the handoff adds a 376-byte notice and one continuation request (23588 bytes) and the built-in call adds one request of +6535 bytes over a normal turn; both carry `cache_control`, and no dollar cost or summary quality was measured

### Requirement: Default Path

The system SHALL use the built-in compaction where no handoff file exists.

#### Scenario: A Manual Compaction With No File

- **WHEN** a main-loop compaction starts and no handoff file exists
- **THEN** the compaction path is the built-in one, and the `PreCompact` hook of the plugin runs on it

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
