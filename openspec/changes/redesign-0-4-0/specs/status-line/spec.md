## ADDED Requirements

### Requirement: Fixed Rows

The main status line SHALL place its segments in at most 4 fixed rows: place (folder, git, change), session (model, context, cost), limits (`5h`, `7d`, spend), and cache.
A segment SHALL NOT move to another row at any width.
When a row does not fit the width, each row SHALL show the countdowns in place of the clock times, and a row that still does not fit SHALL be cut at the right edge.
The first 2 rows SHALL share columns, and the other rows SHALL be joined with no columns.

#### Scenario: Wide Terminal

- **WHEN** the input has the `five_hour` and `seven_day` windows and the terminal is 124 columns wide
- **THEN** the third row holds `5h` and then `7d` with the clock times, and no other row holds a limit

#### Scenario: Narrow Terminal

- **WHEN** the same input shows at 60 columns
- **THEN** the third row holds `5h` and `7d` with the countdowns

#### Scenario: Very Narrow Terminal

- **WHEN** a row does not fit with the countdowns
- **THEN** the row is cut at the right edge with `…`, and its first segment stays

### Requirement: Last Limit Reading

When the input has no window, the status line SHALL show the last reading of that window, dimmed and with its age, until its `resets_at` passes, and SHALL then show nothing for it.
A window with no `resets_at`, such as the spend limit, SHALL show no last reading.

#### Scenario: Missing Window

- **WHEN** an input with no `seven_day` comes after an input with it
- **THEN** the third row shows the last `7d` reading, dimmed, with its age

#### Scenario: Reading Past Its Reset

- **WHEN** the `resets_at` of the last reading has passed
- **THEN** the status line shows no `7d` window

#### Scenario: No Reset Time

- **WHEN** an input with no `spend_limit` comes after an input with it
- **THEN** the status line shows no spend window

### Requirement: Limit Reading File

The status line SHALL keep the last reading of each limit window in a file of its cache folder, with one file for each config folder and the safety checks of the git cache.
A refresh with the same windows SHALL NOT write the file again within a minute.
With an unsafe cache folder, the status line SHALL NOT read or write the file.

#### Scenario: Two Accounts

- **WHEN** a reading comes from one `CLAUDE_CONFIG_DIR`, and the next input with no `seven_day` comes from another
- **THEN** the status line shows no `7d` window

#### Scenario: Same Windows

- **WHEN** three refreshes in two seconds have the same windows
- **THEN** the status line writes the file one time

#### Scenario: Unsafe Cache Folder

- **WHEN** the cache folder has group or other mode bits
- **THEN** the status line reads no reading from it and writes none to it

### Requirement: Countdown Gradient

The status line SHALL color the reset time `↻` of the `5h` and `7d` windows with the stops of "Usage Gradient" at the share of the window left: green near the reset, red with the whole window left.
It SHALL color the run-out time `⏵` linearly from amber, at the reset, to red, now.
A window with no span SHALL keep a dim reset time.

#### Scenario: Reset Soon

- **WHEN** 10% of the `5h` window is left
- **THEN** the reset time has a color close to the green stop

#### Scenario: Run-Out Now

- **WHEN** the run-out time is close to now
- **THEN** the run-out time has a color close to red

#### Scenario: Spend Reset

- **WHEN** the spend limit has a reset time
- **THEN** the reset time is dim

## MODIFIED Requirements

### Requirement: Usage Gradient

The status line SHALL color `context_window.used_percentage`, `rate_limits.five_hour.used_percentage`, and `rate_limits.seven_day.used_percentage` with a color that code makes by linear RGB interpolation between 3 stops: the green stop at 20% and below, the amber stop at 60%, and the red stop at 90% and above (the user, 2026-10-26).
It SHALL draw each label dim.
Setup SHALL write `statusLine.refreshInterval` `5`.

#### Scenario: Low Usage

- **WHEN** the context is at 20%
- **THEN** the value has the green stop color

#### Scenario: Middle Usage

- **WHEN** the plan usage is at 40%
- **THEN** the value has the color halfway between the green and the amber stops

#### Scenario: High Usage

- **WHEN** the context is at 90%
- **THEN** the value has the red stop color

#### Scenario: Labels

- **WHEN** the line draws the label "ctx"
- **THEN** the label is dim


### Requirement: Rate Limits File

The status line SHALL write the last `rate_limits` it received to a file in the temp folder of the `project` module, the same folder that the mod reads.

#### Scenario: Input with Limits

- **WHEN** the status line gets input with `rate_limits`
- **THEN** the file in the temp folder holds those `rate_limits`

#### Scenario: Input with No Limits

- **WHEN** the input has no `rate_limits`
- **THEN** the file keeps its last content
