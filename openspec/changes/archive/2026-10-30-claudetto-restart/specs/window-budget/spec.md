## Purpose

The five-hour and weekly windows are a budget that claudetto measures, so that every saving is shown in window points and not assumed. The method is borrowed from the Botfarm poll of the usage endpoint and from the statusline `rate_limits` fields.

## ADDED Requirements

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
