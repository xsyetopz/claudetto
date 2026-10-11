# status-line Specification

## Purpose

Defines what the dotclaude main and subagent status lines show, the derived values they compute, where their data comes from, and how they fit the terminal width.
The status line keeps no state.
It uses only the status input of Claude Code, plus the reads of Claude Code data that design D35 allows.

## Requirements

### Requirement: Vanilla order

The main status line SHALL put its segments in the order of the vanilla Claude Code footer: the model and effort first, then the context, then usage and cost, then place.

#### Scenario: Row order

- **WHEN** the status input has a model, context, `rate_limits`, and a git folder
- **THEN** row 1 starts with the model, and the place segments come after the usage segments

### Requirement: Public status data

The main status line SHALL show each field of the Claude Code status input that helps the user decide, when the field is present.
The fields are the model, effort, thinking, context, `rate_limits` (5-hour, 7-day, spend limit), `prompt_cache`, `cost`, folder, git worktree, repository, pull request, agent, output style, session name, and vim mode.

#### Scenario: Field absent

- **WHEN** the status input has no `pr` object
- **THEN** the line has no pull-request segment and no empty space for it

### Requirement: Core segments

The main status line SHALL show the context tokens against `CONTEXT_WINDOW`, in yellow and red at `USAGE_LEVELS`, and the headroom to `CONTEXT_WINDOW`.

#### Scenario: Context in red

- **WHEN** the context tokens are 91% of `CONTEXT_WINDOW`
- **THEN** the context segment is red

### Requirement: Pace of each limit

For the 5-hour and 7-day windows, the status line SHALL show the used percentage, the time to reset, and the reserve or deficit against an even pace.
The deficit is the used percentage minus the elapsed percentage of the window.

#### Scenario: Deficit

- **WHEN** 2.5 hours of the 5-hour window passed and 62% is used
- **THEN** the segment shows a deficit of 12 points

#### Scenario: Early window

- **WHEN** less than 3% of the window passed
- **THEN** the segment shows no pace and no run-out time

### Requirement: Run-out time

When a limit will run out before its reset at the current rate, the status line SHALL show the run-out time in a warning color.

#### Scenario: Runs out

- **WHEN** the projected run-out time is before `resets_at`
- **THEN** the segment shows the run-out clock time in yellow or red

### Requirement: Reset credits

The status line SHALL show the count of limit-reset credits that are available now and the next expiry, from the read-only usage cache of Claude Code, and SHALL hide the segment when the cache is absent or has an unknown shape.

#### Scenario: Unknown shape

- **WHEN** the cache has no data in the expected shape
- **THEN** the line has no reset-credit segment and prints with no error

### Requirement: Cache segment

The status line SHALL show the time until the prompt cache expires while it is warm, the session hit ratio, and the miss count with the last miss cause.

#### Scenario: Cache cold

- **WHEN** `prompt_cache.warm` is false
- **THEN** the segment shows that the cache is cold and the tokens that a rebuild costs

### Requirement: Rates

The status line SHALL show the session cost for each hour and the changed lines for each hour, from `cost.total_duration_ms`.

#### Scenario: Rates

- **WHEN** the session ran 2 hours, cost $6, and changed 300 lines
- **THEN** the line shows $3.00/h and 150/h

### Requirement: Place segments

The status line SHALL show the folder, the git branch, the dirty state, ahead and behind counts, the worktree, and the pull request with a link.
The git state SHALL come from one `git --no-optional-locks status` call with a time limit and no cache file.

#### Scenario: Git times out

- **WHEN** `git` does not answer in the time limit
- **THEN** the line shows no git segment and still prints

### Requirement: OpenSpec segment

The status line SHALL show the newest active OpenSpec change and its count of done and total tasks.

#### Scenario: Active change

- **WHEN** `openspec/changes/<name>/tasks.md` has 3 of 10 boxes checked, and the change is not archived
- **THEN** the segment shows the change name and `3/10`

### Requirement: Look

The status line SHALL mark each segment with one icon from one set of single-column symbols, color percentages green, yellow, and red at `USAGE_LEVELS`, show percentages with a meter bar, and blink a warning glyph on an alarm.
It SHALL use no emoji, and no color when `NO_COLOR` is set.

#### Scenario: Alarm

- **WHEN** the cache expires in less than 2 minutes
- **THEN** the cache segment shows a warning glyph that blinks between refreshes

#### Scenario: No color

- **WHEN** `NO_COLOR` is set
- **THEN** the output has no color codes and keeps the icons

### Requirement: Three columns

The status line SHALL show 3 columns of at most 3 rows when they fit in `COLUMNS` (design D33).
Each column SHALL be as wide as its widest cell, and the other segments SHALL fill a cell only when the columns still fit.
When the 3 columns do not fit, the status line SHALL use the row packing of "Fit to width".

#### Scenario: Narrow terminal falls back

- **WHEN** the 3 columns are wider than `COLUMNS`
- **THEN** the output is the row packing, and no row is wider than `COLUMNS`

#### Scenario: Column width

- **WHEN** the 3 columns fit in `COLUMNS`
- **THEN** each column is as wide as its widest cell

### Requirement: Column content

The left column SHALL show the model with its effort, the OpenSpec change, and the task count with the branch.
The middle column SHALL show the context meter and the context breakdown.
The right column SHALL show the 5-hour window, the 7-day window, and the weekly window of Fable 5.1.

#### Scenario: Wide terminal

- **WHEN** `COLUMNS` is 160, and the input has a model, a context window, and both usage windows
- **THEN** the output has 3 rows, and the model, the context meter, and the 5-hour window start the first row in that order

### Requirement: Context breakdown

The status line SHALL show what fills the context only from the newest `/context` table in a bounded tail of the transcript at `transcript_path` (design D33).
It SHALL read that tail at each call, up to `TABLE_TAIL_BYTES_MAX`, and SHALL keep no offset or parsed table.
The status line SHALL NOT estimate a part from the first `usage` or from the start attachments, because that needs a state file (design D35).

#### Scenario: Newest table wins

- **WHEN** the tail holds two `/context` tables
- **THEN** the breakdown uses the newer one

#### Scenario: No table

- **WHEN** `transcript_path` is missing, has no `usage`, or its tail holds no `/context` table
- **THEN** the middle column shows the context meter and the free tokens only

### Requirement: Context table shape

The table SHALL be a `user` record whose string content starts with `## Context Usage` and has the rows `| Category | Tokens | Percentage |`.

#### Scenario: Other record

- **WHEN** a `user` record in the tail does not start with `## Context Usage`
- **THEN** the status line does not read it as a table

### Requirement: Breakdown figures

The fixed parts SHALL be exact: system prompt, system tools, memory files, skills, and custom agents.
The messages SHALL be the current total minus the sum of the fixed parts.
The free tokens SHALL be the window minus `CONTEXT_BLOCK_MARGIN` minus the current total.

#### Scenario: Table in the tail

- **WHEN** the tail holds a `/context` table with memory 1.6k and skills 1.4k, and the current total is 84,000 tokens
- **THEN** the breakdown shows memory `1.6k` and skills `1.4k` as exact, and the messages as the total minus the fixed parts

### Requirement: Fable weekly window

The status line SHALL show the weekly window of Fable 5.1 from the `limits` row with `kind` `weekly_scoped` and `scope.model.display_name` `Fable` in `cachedUsageUtilization` of the Claude Code config, because the status input has no model-scoped window (2.1.295 bundle).
It SHALL hide the window when the cache is older than 1 hour or has no such row.

#### Scenario: Fable row

- **WHEN** the cache is 10 minutes old and has a `weekly_scoped` row for `Fable` at 12%
- **THEN** the right column shows the Fable window at 12% with its reset time

#### Scenario: Stale cache

- **WHEN** the cache is 2 hours old
- **THEN** the status line shows no Fable window

### Requirement: Fit to width

The status line SHALL use at most 3 rows, read the width from `COLUMNS`, and drop the segments of lowest priority first until each row fits.

#### Scenario: Narrow terminal

- **WHEN** `COLUMNS` is 60
- **THEN** no row is wider than 60 columns, and the model and context segments are present

### Requirement: Subagent status line

dotclaude SHALL give a subagent status line that shows one row for each running subagent with its name, agent type, model, effort, context against its window, and run time.

#### Scenario: Two subagents

- **WHEN** the input `tasks` array has two running subagents
- **THEN** the output has one JSON row for each

### Requirement: Settings

The plugin `settings.json` SHALL set `subagentStatusLine`, which Claude Code accepts in a plugin settings file.
The wiki snippet SHALL set `statusLine.refreshInterval` so that the countdowns stay current between messages, and SHALL set `hideVimModeIndicator` when the line shows the vim mode.
The wiki snippet SHALL name the `statusLine` command only if the surface check of task 25.2 finds that the mod cannot draw the main line.
dotclaude SHALL NOT write a launcher stub into the config folder.

#### Scenario: Snippet

- **WHEN** a test reads the snippet
- **THEN** `statusLine` has a `refreshInterval`

### Requirement: No side effects

The status line SHALL call no model, no network, and no program except `git`.
It SHALL write no file, and it SHALL print a line for input that is not valid JSON.

#### Scenario: Bad input

- **WHEN** the status input is not JSON
- **THEN** the status line prints a line and exits with code 0

#### Scenario: No file

- **WHEN** the status line runs with a full status input
- **THEN** it writes no file in the temporary folder, the config folder, or the plugin data folder
