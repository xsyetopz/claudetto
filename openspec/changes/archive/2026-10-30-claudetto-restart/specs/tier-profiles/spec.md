## Purpose

One table holds the cost-driving values, with a row per subscription tier, and setup writes the keys the user keeps.

No reading splits a written key by tier. `SHARED` carries every field `tierSnippet` reads, so all three rows of `plugins/claudetto/src/tiers/tiers.ts` give a byte-identical snippet, and `subagentCap`, the one field the rows tell apart, is written to no settings key: the `agent.spawn` hook of `run-limits` enforces it. The table stays per tier so that a later reading can split a value, and `tests/claudetto/tiers.test.ts` fails when a row starts to differ in a written key.

Setup therefore reads no plan. The premise that "settings that drive cost differ by subscription tier" is not supported by any reading this change took, and this Purpose records that rather than restating it.

## ADDED Requirements

### Requirement: One Row per Tier

The system SHALL define a row for each of `claude_pro`, `default_claude_max_5x`, and `default_claude_max_20x`, with subagent cap, subagent model, main model, effort, context cap, and handoff threshold.

#### Scenario: Source of the Ids and Values

- **WHEN** a row is written
- **THEN** its id is a key of the plan-cap table, which the tier reader fills from `organizationRateLimitTier` or `organizationType` of `.claude.json`. The archived implementation holds both as evidence of the ids (`archive/plugins/claudetto/modules/setup/limits.ts:7-11` and `archive/plugins/claudetto/modules/setup/domain/plan.ts`)
- **AND** its first values are the code values of `design.md`, with the version caveat stated there

#### Scenario: Handoff Threshold

- **WHEN** a row sets the handoff threshold of a model that is not a Haiku model
- **THEN** it SHALL be 140,000, and the row SHALL cite the sweep of this login's own sessions, which priced the real work at every threshold between 60,000 and 280,000 and put the cheapest at 130,000 with the band within 1% of it running from 110,000 to 135,000 (`docs/evidence/compaction/threshold.md`)
- **AND** the value SHALL be 140,000 rather than the 130,000 minimum, because 140,000 is the only threshold inside the within-1% band of every lost-work charge from the measured 20.1 turns to twice it under both summary models
- **AND** the derived `AUTOCOMPACT_PCT` SHALL be `50.0000`, so the engine compacts at exactly 140,000 of the 280,000 effective window

#### Scenario: A Cheaper Threshold Is Not Taken

- **WHEN** the replay shows a threshold cheaper than the one a row sets, as 130,000 is by `$1.57` of `$501.70` against 140,000
- **THEN** the row SHALL keep 140,000, because a difference inside the 1% band is smaller than the replay's own 8% to 11% validation error, and 130,000 would cost the exact derivation: it fires at 129,999 and needs a Haiku window of 213,846
- **AND** the value SHALL change again only on new rows or on the user's word, as it did twice on 2026-10-28, from 225,000 to 200,000 on the replay and then to 140,000 once the lost-work charge was measured

#### Scenario: Any Tier

- **WHEN** setup runs for any login
- **THEN** it writes the snippet of `SNIPPET_ROW`, which is the snippet of every row, and reads no plan, because no written key differs by tier
- **AND** `subagentCap` reaches no settings key for any login; the `agent.spawn` hook holds the cap from the `subagentCap` option instead

#### Scenario: A Row Starts to Differ

- **WHEN** a later reading gives one row a different value for a key `tierSnippet` writes
- **THEN** `tests/claudetto/tiers.test.ts` fails, because it checks that every row gives the snippet of `SNIPPET_ROW`, so the plan reading is added before the wrong plan can be served

### Requirement: Keys Are Checked

Every key that a row sets SHALL exist in the settings schema or the installed binary, and a test SHALL pin it.

#### Scenario: Missing Key

- **WHEN** the installed Claude Code does not know a key of a row
- **THEN** the pin test fails and names the key

### Requirement: Agents Inherit the Tier

Agent files SHALL carry no `model:` line, so that `CLAUDE_CODE_SUBAGENT_MODEL` from the row decides. The order of choice is the per-call `model`, then the agent field, then `CLAUDE_CODE_SUBAGENT_MODEL`, then the main model (`clawdipedia` route `extend/subagents/frontmatter`, row `model`, checked 2026-10-27). Which model the row names is read from `docs/models.md`, and this spec assigns none.

#### Scenario: Subagent Model

- **WHEN** a plugin agent starts with no model passed in the call
- **THEN** it runs on the model of the tier row

### Requirement: Context Cap per Model

A Haiku 5.5 session SHALL stay below 100,000 prompt tokens, because the pricing page bills longer prompts at five times the rate, and cache reads and writes count toward the length. The trigger SHALL be the handoff threshold, which the archived tree names `HAIKU_HANDOFF_TRIGGER_TOKENS`, because `autoCompactWindow` accepts 100K to 1M only. The matching `autoCompactWindow` of a Haiku row SHALL be 200,000, which at `AUTOCOMPACT_PCT` of `50.0000` makes the engine compact at exactly 90,000.

#### Scenario: Haiku Margin

- **WHEN** the trigger value is chosen
- **THEN** it is 90,000, and the row cites the Anthropic page `about-claude/models/optimizing-for-cost-and-intelligence`, which states under "Cache repeated context" that "In Anthropic's test with 10,000-token turns, a trigger of 90,000 cost 70% less per request than the default" (read 2026-10-28, `references.md`). The archived tree holds the same value (`archive/plugins/claudetto/modules/session/limits.ts:26`), and the saving is a vendor test at a 10,000-token turn size and not our measurement, so task 8.7 checks it against our own rows and does not derive it

#### Scenario: Haiku Session

- **WHEN** the main model is Haiku 5.5
- **THEN** the handoff trigger fires below 100,000 prompt tokens

#### Scenario: Other Models

- **WHEN** the main model is Opus 5.5 or Sonnet 5.5
- **THEN** the cap comes from the tier row, and the row cites `references.md`. Vendor sources publish no quality cliff for these models, and the community figures there are opinions, so no cliff is claimed

### Requirement: User Values Stay

A value that the user set, and an option that the user rejected, SHALL stay until the user changes them.

#### Scenario: Existing Key

- **WHEN** the user's settings already hold a key of the row with another value
- **THEN** setup keeps the user's value and lists it as skipped

### Requirement: Setup Asks What to Keep

Setup SHALL run from inside Claude Code with no checkout of this repository, no `bun`, and no `just`, SHALL ask which groups of keys to keep, and SHALL write no key of a group the user discarded. It SHALL cost the session no model tokens (the user, 2026-10-30: "it will ask what to keep, meaning the rest get discarded, upon lightweight setup command", and "we need least-costly (tokens, characters) approach that *works*").

#### Scenario: The Dialog

- **WHEN** `/claudetto:setup` runs with a person to ask
- **THEN** one `$.ui.ask` dialog offers the groups of `plugins/claudetto/src/tiers/groups.ts`, between two and four of them because `$.ui.ask` accepts no other count, and every key the snippet sets sits in exactly one group or in `UNSHIPPED_KEYS`

#### Scenario: A Fact of This Repository Is Not Shipped

- **WHEN** a key of the snippet carries a reading of this repository rather than a value true of any machine
- **THEN** the command SHALL write it for nobody, whatever the dialog is answered, and `UNSHIPPED_KEYS` SHALL name it with the reason
- **AND** `autoMode` SHALL be such a key, because `autoMode.environment` is the facts of this project (`plugins/claudetto/src/automode/environment.ts:1`) and the auto-mode classifier decides from them whether a command runs without asking, so a false fact there widens or narrows a permission on a machine that was never read

#### Scenario: A Discarded Group

- **WHEN** the user keeps some groups and not others
- **THEN** no key of a discarded group is written, and a key of that group the user already holds stays as it is

#### Scenario: Nobody to Ask

- **WHEN** the dialog is dismissed, or there is no one to ask, as in a `claude -p` run
- **THEN** nothing is written and the report says so

#### Scenario: Cost of the Command

- **WHEN** the command answers
- **THEN** it returns `text` and no `context`, so the person reads the report and the model reads nothing of it
- **AND** the only cost is the row in the command listing, measured at 48 characters of the first request by `just capture --arm plugin --shipped` (31,909 against 31,861 with no command)

#### Scenario: A Settings Hook Is Not the Mechanism

- **WHEN** a `settings.read` hook answers the keys in place of a settings file
- **THEN** the readers that build the first request do not take the answer: `just capture --arm plugin` read 61,353 characters and 12 tool schemas with the hook and no file, against 31,861 and 9 with the file, and the engine logged `an answer without deniedMcpServers: unset for the reader`
- **AND** a real settings file SHALL be the mechanism, because a plugin's own `settings` key reaches only `agent` and `subagentStatusLine`

### Requirement: No Promise of Plan Share

The system SHALL NOT state a saving as a share of plan limits without a measurement.

#### Scenario: Setup Report

- **WHEN** setup reports the row it wrote
- **THEN** the report names the keys and values, and gives no percentage of a limit
