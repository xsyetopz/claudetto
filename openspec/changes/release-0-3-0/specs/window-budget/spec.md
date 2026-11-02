## ADDED Requirements

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
