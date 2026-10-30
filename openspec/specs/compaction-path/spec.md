# compaction-path Specification

## Purpose
The path that keeps context across a long session is chosen by measured cost and quality, not by opinion. The default is the built-in path with the handoff as a safety net.

## Requirements

### Requirement: Default Path

Until a probe result is accepted, the system SHALL use the built-in compaction, with a handoff written before it.

#### Scenario: No Probe Yet

- **WHEN** no accepted probe result exists in `docs/`
- **THEN** the compaction path is the built-in one

#### Scenario: No Option Offers the Path

- **WHEN** the plugin's `userConfig` is read for a key that chooses the compaction path
- **THEN** there is none: the `compaction` option that offered `auto`, `built-in`, and `code` is deleted, together with the `pathOf` that resolved it, because nothing but its own spec file imported that resolver, so a person could set a value and no code read it
- **AND** the archived `handover` value is not carried over, because no requirement of this change asks for a path that replaces compaction with a handover
- **AND** the only option near this path is `cheapSummary`, which is the switch of the requirement "The Summarizer Model Is Named, Not Inherited" and chooses the summarizer's model, not the path

#### Scenario: The Code Path Is Offered Again

- **WHEN** a verdict line under `docs/` no longer says "No winner"
- **THEN** `tests/repo/compaction-default.test.ts` fails, which is the signal to build the code path and declare an option for it; until then `src/compaction/hook.ts` answers every compaction with `next(e)`

#### Scenario: A Cost Claim Arrives from Outside

- **WHEN** a source outside this repository states that the built-in compaction is expensive
- **THEN** the default changes only on rows of this login, and the claim is recorded in `references.md` with its method and its sample. Four such sources were read on 2026-10-28 and none changed a value, because the only one with a real sample fits its band on a window near 1M against the 300,000 this project sets, and because the figure most often quoted, about `$3.00` per compaction, appears in no source read
- **AND** one of the four did change what a value cites without changing the value: the Anthropic page `about-claude/models/optimizing-for-cost-and-intelligence` is the first vendor source for the 90,000 Haiku trigger, which `tier-profiles` had recorded as having none and now cites at its "Haiku Trigger" scenario

### Requirement: Decision Rule

The system SHALL switch to another path only when the arm shows a lower mean cost per fork than the built-in arm at each size and no worse result on each bar: constraints broken, files re-read, work redone, and the next task done. It SHALL also show no cache problem: no larger first cache write and no lower cache read share in either follow-up.

#### Scenario: A Bar Is Read

- **WHEN** a report scores an arm against the bars
- **THEN** it takes each definition from `docs/evidence/code-compaction-probe.md`, "The Bars", which names no file of a probe harness, so the rule outlives the harness that produced it

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
- **THEN** it is read from `$.session.usage()` deltas across the boundary and never from the transcript, because the transcript carries no `usage` record for the summarizer request at all: the summary arrives as a `user` message with `isCompactSummary` of `true` and no `usage` block, and no `assistant` record exists for that turn (measured over 35 real compactions, `docs/evidence/compaction/boundaries.md`)

#### Scenario: The Saving Is Claimed

- **WHEN** a document states the saving of the cheap summarizer
- **THEN** it cites rows of a real session and not round 9 of the probe, because round 9 made the summary cheap by running `/compact` as its own `claude -p --model claude-haiku-5-5` process (`archive/dev/probe/plan.ts:40-84`), which no live session does, and the cost it measured, 22 percent of a fork at `80k` and 33 percent at `200k`, was billed on `claude-sonnet-5-5` and not on the Opus row of this login

### Requirement: Paid Runs Need Approval

A paid probe SHALL run only after the user approves it with its expected cost as a share of the weekly limit.

#### Scenario: Declined

- **WHEN** the user declines the probe
- **THEN** no model call is made and the default path stays

### Requirement: Runs Repeat

Each arm SHALL run more than one fork, and the report SHALL list the cost of each fork.

#### Scenario: One Slow Fork

- **WHEN** the first fork of an arm pays a large cache write
- **THEN** the report shows it apart from the mean
