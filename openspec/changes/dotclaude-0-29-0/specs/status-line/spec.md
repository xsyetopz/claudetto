## ADDED Requirements

### Requirement: Three rows

The main status line SHALL show 3 rows with one topic each: session usage on row 1, weekly usage on row 2, and context on row 3 (design D3).
Each row SHALL fit in `COLUMNS` by the rule of "Fit to width".
A row SHALL show no empty space for a segment whose data is absent.

#### Scenario: Wide terminal

- **WHEN** `COLUMNS` is 160, and the input has a model, a context window, and both usage windows
- **THEN** the output has 3 rows, row 1 starts with the model, row 2 starts with the 7-day window, and row 3 starts with the context meter

#### Scenario: No usage data

- **WHEN** the input has no `rate_limits` and the usage cache of Claude Code is absent
- **THEN** row 1 shows the model, the cost, and the cache, and row 2 shows only the place segments

### Requirement: Row content

Row 1 SHALL show the model with its effort, the 5-hour window with its pace, run-out time, and reset time, the session cost with its rates, and the cache segment.
Row 2 SHALL show the 7-day window with its pace and reset time, each model-scoped weekly window, the spend limit, the reset credits, the OpenSpec change with its task count, and the git branch.
Row 3 SHALL show the context meter and the parts of "Context breakdown".

#### Scenario: Usage rows

- **WHEN** the input has `rate_limits.five_hour` at 40% and `rate_limits.seven_day` at 20%
- **THEN** row 1 holds the 5-hour segment and row 2 holds the 7-day segment

## MODIFIED Requirements

### Requirement: Context breakdown

The status line SHALL show what fills the context only from the newest `/context` table in a bounded tail of the transcript at `transcript_path` (design D33 of 0.28.0).
It SHALL read that tail at each call, up to `TABLE_TAIL_BYTES_MAX`, and SHALL keep no offset or parsed table.
The status line SHALL NOT estimate a part from the first `usage` or from the start attachments, because an estimate is not Claude Code data and `/context` gets the figures from a `count_tokens` call (design D3).
When the tail has no table, row 3 SHALL show the context meter, the free tokens, and a short hint to run `/context`.

#### Scenario: Newest table wins

- **WHEN** the tail holds two `/context` tables
- **THEN** the breakdown uses the newer one

#### Scenario: No table

- **WHEN** `transcript_path` is missing, has no `usage`, or its tail holds no `/context` table
- **THEN** row 3 shows the context meter, the free tokens, and the `/context` hint only

### Requirement: Breakdown figures

The fixed parts SHALL be exact from the table: system prompt, system tools, MCP tools, MCP server instructions, custom agents, memory files, skills, and the compact buffer.
A part that the table does not list SHALL NOT show.
The messages SHALL be the current total minus the sum of the fixed parts.
The free tokens SHALL be the window minus `CONTEXT_BLOCK_MARGIN` minus the current total.

#### Scenario: Table in the tail

- **WHEN** the tail holds a `/context` table with memory 1.6k, skills 1.4k, and MCP tools 326, and the current total is 84,000 tokens
- **THEN** row 3 shows memory `1.6k`, skills `1.4k`, and MCP `326` as exact, and the messages as the total minus the fixed parts

#### Scenario: Part not in the table

- **WHEN** the table has no `MCP tools` row
- **THEN** row 3 has no MCP segment

### Requirement: Fable weekly window

The status line SHALL show each model-scoped weekly window from the `limits` rows with `kind` `weekly_scoped` in `cachedUsageUtilization` of the Claude Code config, with the name from `scope.model.display_name`, because the status input has no model-scoped window (2.1.296 bundle).
It SHALL hide these windows when the cache is older than 1 hour or has no such row.

#### Scenario: Fable row

- **WHEN** the cache is 10 minutes old and has a `weekly_scoped` row for `Fable` at 12%
- **THEN** row 2 shows the Fable window at 12% with its reset time

#### Scenario: Stale cache

- **WHEN** the cache is 2 hours old
- **THEN** the status line shows no model-scoped window

### Requirement: Fit to width

The status line SHALL use at most 3 rows, read the width from `COLUMNS`, and drop the segments of lowest priority first until each row fits.
The model on row 1, the 7-day window on row 2, and the context meter on row 3 SHALL stay at each width.

#### Scenario: Narrow terminal

- **WHEN** `COLUMNS` is 60
- **THEN** no row is wider than 60 columns, and the model, the 7-day window, and the context meter are present

## REMOVED Requirements

### Requirement: Vanilla order

**Reason**: The user asked for rows by topic, with usage on rows 1 and 2 and context on row 3, so the vanilla footer order no longer applies.
**Migration**: "Three rows" and "Row content" set the order.

### Requirement: Three columns

**Reason**: The columns put the context breakdown in a narrow cell, so it showed only some `/context` categories.
**Migration**: "Three rows" replaces it.

### Requirement: Column content

**Reason**: The content moves from columns to rows.
**Migration**: "Row content" replaces it.
