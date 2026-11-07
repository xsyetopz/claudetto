## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: The Compaction Result of a Handover Keeps the First Message

The compaction result of a handover SHALL keep the session's first message ahead of the handoff, so the cached prefix up to that message can be read.

#### Scenario: First Message Kept

- **WHEN** a handover replaces a compaction of a session whose first message is `first`
- **THEN** the result holds the first message, an assistant line, and the handoff, in that order (`plugins/claudetto/hooks/handoff/handover.test.ts`, "the compaction keeps the first message, an assistant line, and the handoff")

## REMOVED Requirements

### Requirement: The Handover Keeps the First Request's Bytes

**Reason**: Its scenarios compared the whole next request with the first request on the fake Messages API, and recorded a real-run miss in `ISSUES.md`. The probing tool `claudekit/` left this repo under task 17.13 (`e20d11df`), and `ISSUES.md` is not in the tree.
**Migration**: "The Compaction Result of a Handover Keeps the First Message" binds the part that ships to its test.

### Requirement: Model Cost Is Counted

**Reason**: Its "Cheap-Model Arm" scenario priced the Haiku summary, which task 5.7 removed, its text cited `architecture.md`, which is not in this change, and the probe it bound left this repo under task 17.13.
**Migration**: None: the probe that counted it left this repo under task 17.13, and task 18.16 removes the other probe requirements of this capability.

### Requirement: The Summarizer Model Is Named, Not Inherited

**Reason**: It specified the `session.compact` handler that answers with one `$.model.complete` call on Haiku, together with the `cheapSummary` switch. Task 5.7 removed both, and no code is left (`cheapSummary` and `cheapSummaryEnabled` are gone from `plugin.json`).
**Migration**: The engine's own compaction answers every compaction that no handover replaces, as "Default Path" says.

### Requirement: Decision Rule

**Reason**: It scored the arms of the compaction probe (cost per fork, constraints broken, files re-read, work redone, next task done). The probing tool `claudekit/` left this repo under task 17.13 (`e20d11df`) and its source stays in history at `e20d11df~1:claudekit`. Task 5.7 removed the only non-default arm, so no arm is left to score.
**Migration**: None: the engine's own compaction is the path, as "Default Path" says.

### Requirement: Runs Repeat

**Reason**: It bound the fork runs per arm of the compaction probe, which left this repo under task 17.13 (`e20d11df`), with its source in history at `e20d11df~1:claudekit`.
**Migration**: None.

### Requirement: A Paid Run Is Counted Free First

**Reason**: It bound the probe's paid runs to a free count on the fake Messages API first. The probe left this repo under task 17.13 (`e20d11df`), with its source in history at `e20d11df~1:claudekit`. Paid runs now go by the user's consent (task 17.11), and their tokens are recorded in `openspec/changes/release-2-1-319/footprint.md`, "Paid run for task 7.5".
**Migration**: None.

### Requirement: A Probe Stops Only Its Own Processes

**Reason**: Its subject was the probe's launcher and its fake Messages API, which left this repo under task 17.13 (`e20d11df`), with their source in history at `e20d11df~1:claudekit`.
**Migration**: None: no script of this repo starts a long-running process of its own.
