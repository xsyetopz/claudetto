# window-budget Specification

## Purpose
The five-hour and weekly windows are a budget that claudetto measures, so that every saving is shown in window points and not assumed. The method is borrowed from the Botfarm poll of the usage endpoint and from the statusline `rate_limits` fields.

## Requirements

### Requirement: Record Window Change per Turn

The system SHALL record the change of the five-hour and the weekly `used_percentage`, and the input, cache write, cache read, and output tokens of each turn with the model that spent them. This depends on task 7.3 showing where the token fields come from.

The two halves are two series and not one row, because the engine reports them at two different moments. `session.measure` carries a rate-limit reading and the context size of the session at that instant, and it names no model; `turn.complete` carries the four token counts of one completed turn and the model it ran on, and it carries no rate-limit reading. So `window.rows` holds `WindowRow`, with the points moved, the context `tokens`, and the dollars, and `window.turns` holds `TurnRow`, with the model and the four counts (`src/window/window.ts`). Both carry `at`, `task`, and `source`, which is what joins them: the weight of a token is the points of one series over the tokens of the other for the same task.

#### Scenario: Token Fields Not Shown

- **WHEN** task 7.3 has not shown the token fields in `$.session.usage()` or `session.measure`
- **THEN** the rate-limit row holds the points moved and no model, the token counts and the model come from `turn.complete`, and the two are joined on `task`
- **AND** the headless stub probe, which returned only `{startedAt, context, rateLimits:[], cost}`, is not conclusive (`references.md`, "Stub-Mod Probe")

#### Scenario: A Turn Moves the Window

- **WHEN** a turn ends and a rate-limit window moved by a whole point
- **THEN** `window.rows` holds one row with the window, the points moved, the context tokens, and the dollars
- **AND** `window.turns` holds one row for that turn with its model and its four token counts, under the same `task`

#### Scenario: Login without Windows

- **WHEN** the login has no rate-limit windows, as with an API key
- **THEN** the system records the cost in dollars and writes no window row

### Requirement: Report from Many Turns

The system SHALL report points per task from the sum over many turns, because the percentages are whole numbers that lag.

#### Scenario: One Turn

- **WHEN** only one row exists for a task
- **THEN** the report marks the figure "too few rows"

### Requirement: Report the Weights Only When Measured

The system SHALL report the points that a token of each kind costs for this login only after enough rows exist, and SHALL otherwise print "not measured".

#### Scenario: Too Few Rows

- **WHEN** the rows do not yet support a weight
- **THEN** the report prints "not measured" and gives no number

### Requirement: No Claim without Rows

The system MUST NOT print a saving as a share of a plan limit unless rows of this login back it.

A reading of fewer than `WEIGHT_MIN_ROWS` rows is not rows that back a claim, so `weightOf` answers "not measured" below that floor (`plugins/claudetto/src/window/limits.ts`). The floor counts each side on its own: the measure rows holding a delta for the window asked for, and the turns that reported tokens.

#### Scenario: Setup Report

- **WHEN** setup reports a saving
- **THEN** it cites the rows, or says "not measured"
- **AND** the report of `/claudetto:setup` names keys and values and no share of a limit, which satisfies this by claiming nothing, as `tier-profiles` requires of it under "No Promise of Plan Share"

#### Scenario: Too Few Rows

- **WHEN** fewer than `WEIGHT_MIN_ROWS` rows back a weight
- **THEN** the report says "not measured" in place of the number

### Requirement: A Stop Loop with No Progress Is Ended

When a Stop hook blocks the session three times in a row and no turn between the blocks changed a file, claudetto SHALL show the user one line naming the loop and `/goal clear`, and SHALL tell the session to answer the next block in one line with no tool call.

#### Scenario: Goal That Waits on the User

- **WHEN** a `/goal` Stop hook blocks three times while every open task waits on the user
- **THEN** the user sees one line that names `/goal clear`, and the next block costs one short reply

### Requirement: The Weekly Share Slows the Session

When the seven-day share used is at or above 90%, the prompt hook text SHALL tell the session to start no subagent fan-out and no paid eval run, and to report the remaining share with each reply that spent more than one percent of it.

#### Scenario: Share at 99%

- **WHEN** the prompt hook reads a seven-day share of 99%
- **THEN** its text tells the session to start no fan-out or paid run, and names the share

### Requirement: Window Rows Are Recorded

The window recorder SHALL write a row for each session in which the prompt hook read rate limits, so that `just window-report` prints measured points per task.

#### Scenario: Week of Sessions

- **WHEN** a week of sessions ran with rate limits on stdin
- **THEN** `just window-report` does not print "not measured"

### Requirement: The Share Rate Matches the Meter

`claudekit/price/share.ts` SHALL take its dollars per weekly percent from more than one meter reading, and SHALL record each reading with its date.

#### Scenario: Meter at 99%

- **WHEN** the week's transcripts price at $1,392 and the meter reads 99%
- **THEN** the rate is recalibrated from the readings rather than reporting 47%

### Requirement: The Classify Block's Spend Is Counted

The `classify` block SHALL record the tokens of each of its model calls, and the window report SHALL show their total and their share of the week, because the block runs beside the engine's own classifier on every call that is not read-only and its spend is not in the transcripts.

#### Scenario: Week Report

- **WHEN** `just window-report` runs after a week of sessions with the `classify` block on
- **THEN** it prints the `classify` block's tokens and their share of the week, or "not measured" with the reason

### Requirement: Window Rows Record the Cache TTL

Each window row SHALL record the cache TTL of the main conversation that the session ran under: `5m` when `FORCE_PROMPT_CACHING_5M` is set, else the value of `CLAUDE_CODE_PROMPT_CACHE_TTL`, else the `promptCacheTtl` setting, else `auto`; a value other than `5m` or `1h` counts as unset.

#### Scenario: Setting Unset

- **WHEN** none of the variables and the setting is set
- **THEN** the row records `auto`

### Requirement: The Window Report Prices Each Cache TTL

`just window-report` SHALL print the dollars per weekly percent for each of `5m`, `1h`, and `auto`, with "not measured" for a value that has no measured row, because a 1-hour cache write is billed above a 5-minute one while it avoids the rewrite after an idle gap of more than 5 minutes.

#### Scenario: Rows Under Two TTLs

- **WHEN** the recorder holds rows with `ttl` `1h` and rows with `ttl` `auto`
- **THEN** the report prints one rate for each, or "not measured" for a value with no row
