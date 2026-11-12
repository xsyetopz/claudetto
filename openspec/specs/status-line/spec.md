# status-line Specification

## Purpose
A status line and a subagent status line that read only the stdin JSON of Claude Code `2.1.314`.

## Requirements

### Requirement: Stdin Only

The status line command SHALL build its output from its stdin JSON and from bounded reads of local files. It SHALL make no network call, no model call, and start no child process. The only files it reads are those that the requirements "Branch of a Plain Checkout", "Open OpenSpec Changes", "Context Is Measured Against the Window in Force", and "A Warning Shows When Hooks Stop" name. Each read SHALL be capped in bytes, and a missing or unreadable file SHALL leave its part out.

#### Scenario: Normal Input

- **WHEN** the command gets a `2.1.316` status line JSON on stdin
- **THEN** it prints its lines and exits 0, and a test shows no network or process call and no file read outside the named files

#### Scenario: The Transcript and the Heartbeat

- **WHEN** the line checks for stopped hooks
- **THEN** it reads the last 256 KiB of the file at stdin `transcript_path` and the first 64 bytes of the session's heartbeat file under the project folder, and no other file (`hooks-off.ts:13-14,65-68`)

#### Scenario: Unreadable File

- **WHEN** `.git/HEAD` or a `tasks.md` cannot be read
- **THEN** that part is left out, the rest prints, and the exit code is 0

### Requirement: Fixed Defects of the Old Line

The rebuilt line SHALL NOT show defects D1 to D4 and D7 of the status-line defect report of 2026-10, kept outside this repo. Each has a test with the input that showed it.

#### Scenario: Old Defect Input

- **WHEN** the command gets the input of one listed defect
- **THEN** its output is the fixed one

### Requirement: Bad Input Does Not Break the Line

A missing field or input that is not JSON SHALL print a short line and exit 0, never a stack trace.

#### Scenario: Missing Field

- **WHEN** a field the line uses is absent
- **THEN** that part is left out and the rest prints

### Requirement: Setup Writes Both Lines

Setup SHALL write `statusLine` as a command at the plugin root with `refreshInterval` 5, and keep a value the user set whole. `subagentStatusLine` SHALL ship in the plugin's root `settings.json`, and setup SHALL NOT write it.

#### Scenario: User Line Kept

- **WHEN** `statusLine` is already set to another command
- **THEN** setup keeps it and the report says so

#### Scenario: Subagent Line from the Plugin

- **WHEN** the plugin is enabled
- **THEN** `subagentStatusLine` comes from the plugin's root `settings.json` and no setup step writes it

### Requirement: `/statusline` Is Answered Without a Model Call

The built-in `/statusline` with no arguments SHALL write claudetto's `statusLine` to the user settings file and print a report of what it wrote. It SHALL make no model call and add nothing to the context. A line the user already set SHALL be kept, and the report SHALL say it was kept.

#### Scenario: No Line Set

- **WHEN** the user runs `/statusline` and the settings file has no `statusLine`
- **THEN** the key is written with claudetto's command, the report names the file, and no model request is sent

#### Scenario: User Line Kept

- **WHEN** the user runs `/statusline` and the settings file has a `statusLine` that is not claudetto's
- **THEN** that value is unchanged, and the report says it was kept

#### Scenario: Unreadable Settings

- **WHEN** the settings file is not a JSON object
- **THEN** nothing is written, and the report names the file to fix

### Requirement: Branch of a Plain Checkout

The status line SHALL show the current branch in a plain checkout, not only in a worktree session. When stdin carries `worktree.branch`, that value is shown. Otherwise the branch is read from the `HEAD` file of the repository that holds the project folder, following a `.git` file's `gitdir:` line for a linked worktree or a submodule. A detached `HEAD` SHALL show its first 7 hex digits. A folder in no repository SHALL show no branch.

#### Scenario: Plain Checkout on Main

- **WHEN** the project folder is a plain checkout whose `.git/HEAD` reads `ref: refs/heads/main`, and stdin has no `worktree`
- **THEN** the first row shows the branch icon and `main`

#### Scenario: Linked Worktree

- **WHEN** the project folder's `.git` is a file with a `gitdir:` line
- **THEN** the branch is read from the `HEAD` of that folder

#### Scenario: Detached Head

- **WHEN** `HEAD` holds a commit hash
- **THEN** the branch part shows the first 7 hex digits of the hash

#### Scenario: Outside a Repository

- **WHEN** no `.git` exists in the project folder or its parents
- **THEN** no branch part is shown and the rest of the row prints

### Requirement: Open OpenSpec Changes

The status line SHALL show each open OpenSpec change of the project: a change folder under `openspec/changes/`, other than `archive`, whose `tasks.md` has at least one unticked box. Each change SHALL show its name and its ticked and total box counts, such as `release-0-3-0 4/12`. When more than two changes are open, the two most recently modified are shown and the rest are counted as `+N`. A change whose boxes are all ticked, or which has no `tasks.md`, SHALL NOT be shown.

#### Scenario: One Open Change

- **WHEN** `openspec/changes/release-0-3-0/tasks.md` has 12 boxes of which 4 are ticked
- **THEN** the line shows `release-0-3-0 4/12`

#### Scenario: Only Finished Changes

- **WHEN** every `tasks.md` under `openspec/changes/` has all boxes ticked
- **THEN** no OpenSpec part is shown

#### Scenario: Many Open Changes

- **WHEN** four changes are open
- **THEN** the line shows the two most recently modified and `+2`

#### Scenario: No OpenSpec Folder

- **WHEN** the project has no `openspec/changes/` folder
- **THEN** no OpenSpec part is shown and nothing else changes

### Requirement: Cache Countdown

The status line SHALL show the prompt cache of the main conversation from the `prompt_cache` object of its stdin: while `warm` is `true`, the time left until `expires_at` (Unix seconds), the `ttl`, and `hit_ratio` as a percent; while `warm` is `false`, `cold` and `recache_tokens_if_cold`, and `hit_ratio` as a percent when stdin has one. It SHALL show nothing when `prompt_cache` is absent, `warm` is not a boolean, or `caching_observed` is `false`.

#### Scenario: Cache Colors

- **WHEN** the cache part is shown
- **THEN** a warm cache SHALL be painted `success` and a cold one `inactive`

#### Scenario: Warm Cache

- **WHEN** stdin has `prompt_cache` with `warm` `true`, `ttl` `"5m"`, `expires_at` 252 seconds after now, and `hit_ratio` 0.91
- **THEN** the cache part reads `4m/5m 91%` (`tools/statusline/cache.test.ts`, "a warm cache shows the time left, the `ttl`, and the hit share")

#### Scenario: Cold Cache

- **WHEN** stdin has `prompt_cache` with `warm` `false` and `recache_tokens_if_cold` 120000, and no `hit_ratio`
- **THEN** the cache part reads `cold +120k` (`cache.test.ts`, "a cold cache shows `cold` and the tokens a next turn writes again")

#### Scenario: Cold Cache with a Hit Ratio

- **WHEN** stdin has `warm` `false`, `recache_tokens_if_cold` 120000, and `hit_ratio` 0.5
- **THEN** the cache part reads `cold +120k 50%` (`segments.ts:237,243`)

#### Scenario: No Cache Data

- **WHEN** stdin has no `prompt_cache`, or `caching_observed` is `false`
- **THEN** no cache part is shown and the rest of the row prints

#### Scenario: Expired Between Refreshes

- **WHEN** `warm` is `true` but `expires_at` is already past
- **THEN** the time left reads `0s`, not a negative time, because the time left SHALL never be negative

#### Scenario: Missing Expiry

- **WHEN** `warm` is `true` and `expires_at` is `null`
- **THEN** the cache part reads `warm`, with the `ttl` when stdin has one

### Requirement: Cache Miss Cause

The status line SHALL name the likely cause of the last cache miss when `prompt_cache.misses` is above 0 and `prompt_cache.last_miss_cause.causes` is a non-empty array of strings: the first cause, with `_` shown as a space, such as `tools changed`, after `miss: `. It SHALL show no cause part for an unknown cause shape, and SHALL cap the cause words at 24 characters.

#### Scenario: Tools Changed

- **WHEN** stdin has `prompt_cache.misses` 1 and `last_miss_cause.causes` `["tools_changed"]`
- **THEN** the cache part adds `miss: tools changed`

#### Scenario: No Miss

- **WHEN** `prompt_cache.misses` is 0
- **THEN** no cause part is shown

### Requirement: `/statusline` With Text Uses an Edit Text

`/statusline <text>` SHALL replace the built-in command's prompt, through `skill.prompt`, with claudetto's edit text, so the main model edits the setting under the stock grant. It SHALL NOT pass the call through to the built-in command, and it SHALL NOT answer with a denial text.

#### Scenario: Text Given

- **WHEN** the user runs `/statusline show the time`
- **THEN** the main model receives the edit text in place of the built-in prompt

#### Scenario: The Built-in Agent Is Withheld

- **WHEN** the built-in `statusline-setup` agent is withheld by `agent.offer`
- **THEN** `/statusline <text>` still works, and no answer names `Agent(statusline-setup)` in `permissions.deny`

### Requirement: Context Is Measured Against the Window in Force

The context part SHALL show the input tokens as a percent of the window that compaction runs against, not of the model's window. The claudetto mod SHALL write that window after each response to a session file under `.claude/claudetto/`, and the line SHALL read it.

#### Scenario: Where the Window Comes From

- **WHEN** the mod writes the session file
- **THEN** it takes `context.breakdown.rawMaxTokens` from `$.session.usage({ breakdown: "summary" })` (`index.d.ts:11773-11801`), because stdin `context_window_size` is the model's window and `used_percentage` is measured against it (`Mut` in `chunk-24jdhyyr.js`, 2.1.319)

#### Scenario: A 300k Compaction Window on a 1M Model

- **WHEN** the model's window is 1,000,000, `autoCompactWindow` is 300000, and the last response read 100,000 input tokens
- **THEN** the part reads `ctx 33% of 300k`, where today it reads `ctx 10% of 1M`

#### Scenario: A Window Changed in the Session

- **WHEN** `/autocompact` or a per-model `autoCompactWindow` sets another window
- **THEN** the part shows that window after the next response

#### Scenario: No Window File

- **WHEN** the file is absent or unreadable, such as before the first response
- **THEN** the context part is left out, as "Stdin Only" says for a missing file

#### Scenario: The Call Is Free

- **WHEN** the mod reads the window
- **THEN** it sends no token-count or model request, because `summary` "estimates locally and sends none" (`index.d.ts:12709-12710`)

### Requirement: Colours Follow the Claude Code Theme

The line SHALL paint each part with the colour of the active Claude Code theme's role for it: `success`, `warning`, `error`, `inactive`, `claude` for the model, and `merged` for the branch. The mod SHALL write the `theme` setting's name into the same session file, and the line SHALL map it to a palette copied from the engine's built-in tables.

#### Scenario: No Theme on Stdin

- **WHEN** the line looks for the theme
- **THEN** it reads the session file, because the 2.1.319 status line JSON has no theme key (`chunk-24jdhyyr.js`) and `$.config.list()` returns the `theme` row (`index.d.ts:3272`)

#### Scenario: A Light Theme

- **WHEN** the theme is `light`
- **THEN** the line paints `success` `rgb(44,122,57)`, `error` `rgb(171,43,63)`, `warning` `rgb(150,108,30)`, and `inactive` `rgb(102,102,102)`, where today it paints the dark values on every theme (`statusline/color.ts:11-13, 49`)

#### Scenario: A Daltonized Theme

- **WHEN** the theme is `light-daltonized` or `dark-daltonized`
- **THEN** `success`, `error`, `warning` are `rgb(0,102,153)`, `rgb(204,0,0)`, `rgb(255,153,0)` on light and `rgb(51,153,255)`, `rgb(255,102,102)`, `rgb(255,204,0)` on dark (`chunk-w5ysqthb.js` offsets 14298 and 19252, 2.1.319)

#### Scenario: An ANSI Theme

- **WHEN** the theme is `light-ansi` or `dark-ansi`
- **THEN** the line paints with the engine's ANSI names as SGR codes: green, red, yellow, magenta (`32`, `31`, `33`, `35`) and `inactive` bright black (`90`) on light; the bright forms (`92`, `91`, `93`, `95`) and `inactive` white (`37`) on dark (offsets 9447-11896)

#### Scenario: The Table for Each Name

- **WHEN** the line picks a palette
- **THEN** it maps the name as the engine's `RK` does (`chunk-w5ysqthb.js` offset 21034): `light`, `light-ansi`, `dark-ansi`, `light-daltonized`, `dark-daltonized` to their tables, and any other name to `dark`

#### Scenario: No Theme File

- **WHEN** the session file is absent
- **THEN** the line paints with no colour, as it does under `NO_COLOR`

#### Scenario: The Copied Palette Is Checked

- **WHEN** the engine version changes
- **THEN** a test compares the copied palette with the engine's tables and fails on a difference

### Requirement: Items Flow into Rows

The line SHALL lay its items out in one sequence, in the order place, session, limits, cache, joined by ` · `, and SHALL start a new row only when the next item does not fit the terminal width, up to 4 rows. It SHALL NOT tie an item to a fixed row.

#### Scenario: A Wide Terminal

- **WHEN** every item fits in 2 rows of the width
- **THEN** the line prints 2 rows, the second continuing where the first ended, such as `◫ ctx 33% of 300k · +719 −21 · ◷ 7d 1% ⇣4% ↻Nov 16 at 6am · ⌁ 59m/1h 97%`

#### Scenario: A Narrow Terminal

- **WHEN** the items with clock times do not fit in 4 rows
- **THEN** the line uses countdowns, and an item that still does not fit in the fourth row is cut at the width

#### Scenario: An Item Wider Than a Row

- **WHEN** one item alone is wider than the terminal
- **THEN** it takes its own row, cut at the width

### Requirement: A Warning Shows When Hooks Stop

The line SHALL show `✗ claudetto hooks off: /reload-plugins` as its first item when claudetto's hooks stopped while the session went on.

#### Scenario: Reply Newer Than the Heartbeat

- **WHEN** the newest reply is more than 5 minutes newer than the heartbeat
- **THEN** the warning shows (`tools/statusline/hooks-off.test.ts`, "a reply more than 5 minutes newer than the heartbeat shows the warning")

#### Scenario: Within the Margin

- **WHEN** the reply is within 5 minutes of the heartbeat
- **THEN** no warning shows ("a reply within 5 minutes of the heartbeat shows no warning")

#### Scenario: No Heartbeat

- **WHEN** no heartbeat exists and a reply is more than 5 minutes into the session
- **THEN** the warning shows, and a reply in the first 5 minutes shows none ("no heartbeat and a reply more than 5 minutes into the session shows the warning")

### Requirement: The Hooks-Off Warning Is Judged from the Transcript and Heartbeat

The line SHALL judge the warning from the newest `assistant` entry in the transcript tail and the session's heartbeat file: a reply newer than the heartbeat by more than 5 minutes, or, with no heartbeat, a reply more than 5 minutes after the session's start (`now` less `cost.total_duration_ms`).

#### Scenario: Judged by the Newest Reply

- **WHEN** the newest `assistant` entry is more than 5 minutes newer than the heartbeat
- **THEN** the line judges the hooks stopped

### Requirement: Nothing to Judge Gives No Warning

Any part that cannot be read, a missing `session_id` or `transcript_path`, or a transcript with no reply SHALL give no warning.

#### Scenario: Nothing to Read

- **WHEN** the transcript is missing or holds no reply
- **THEN** no warning shows ("a missing transcript shows no warning", "a session with no reply yet shows no warning")

### Requirement: Place and Session Parts

The line SHALL show the folder, as the base name of `workspace.current_dir`, else `cwd`, in bold after `⌂`, and the branch (as "Branch of a Plain Checkout" says) after `⎇`, each left out when its field is absent.

#### Scenario: Folder Absent

- **WHEN** stdin has neither `workspace.current_dir` nor `cwd`
- **THEN** no folder part shows

### Requirement: Model Part

The line SHALL show the model, as `❖` and `model.display_name`, else `model.id`, then `effort.level`, the word `think` when `thinking.enabled` is `true`, and the word `fast` when `fast_mode` is `true`, left out when its field is absent.

#### Scenario: Model Marks

- **WHEN** stdin has a model name, effort `high`, `thinking.enabled` `true`, and `fast_mode` `true`
- **THEN** the part reads `❖ <name> high think fast` (`tools/statusline/defects.test.ts`, "thinking shows the word `think`, not a bare glyph", "fast mode shows the word `fast`")

### Requirement: Pull Request Part

The line SHALL show the pull request, as `⇄ #12 approved`, or `⇄ !12` for `pr.kind` `mr`, with `pr.review_state` after the number, left out when its field is absent.

#### Scenario: Review State Colour

- **WHEN** `pr.review_state` is `approved`, `pending`, `changes_requested`, or `draft`
- **THEN** the pull request part is painted `success`, `warning`, `error`, or `inactive`, and any other state is painted `warning` (`color.ts:130-136,149`)

#### Scenario: A Merge Request

- **WHEN** `pr.kind` is `mr` and `pr.number` is 12
- **THEN** the part reads `⇄ !12`, and a `pr` with no number shows nothing

### Requirement: Cost and Lines Part

The line SHALL show `total_cost_usd` as `$N.NN` and the lines changed as `+added -removed` from `cost`. It SHALL hide the dollars while `rate_limits` reports a `five_hour` or `seven_day` window, because the figure is a client-side estimate, and SHALL show the lines when either count is above 0.

#### Scenario: Subscription Login

- **WHEN** `rate_limits.five_hour` is present and `cost.total_cost_usd` is 1.5
- **THEN** no dollars show, and `+N -M` still shows (`tools/statusline/defects.test.ts`, "the cost is hidden while a 5 hour window is reported", "the lines added and removed still show on a subscription login")

#### Scenario: No Subscription

- **WHEN** `rate_limits` has no window
- **THEN** the dollars show ("the cost shows on a login with no subscription window")

### Requirement: Limit Parts

The line SHALL show one part for each of `rate_limits.five_hour` (`5h`), `seven_day` (`7d`), and `spend_limit` (`spend`), in that order, each as `◷ <label> <percent>%` from `used_percentage`, painted in the usage gradient (green to 20%, amber at 60%, red from 90%). A window with no `used_percentage` SHALL show nothing.

#### Scenario: A Missing Window

- **WHEN** the API leaves `seven_day` out
- **THEN** no `7d` part shows and the other parts print

### Requirement: The Spend Part Adds Amounts

A `spend` window with `used_usd` and `limit_usd` SHALL add `$used/$limit` and its `period`. `spend` has no pace and a dim reset.

#### Scenario: A Spend Window

- **WHEN** `spend_limit` has `used_usd` 5, `limit_usd` 20, and a `period`
- **THEN** the part adds `$5/$20` and the period, with no pace

### Requirement: The Five-Hour and Seven-Day Parts Add Pace

For `5h` and `7d` the part SHALL add the pace once 3% of the window has passed: `⇣N%` in `success` for a reserve, or `⇡N%` in `warning` for a deficit, where N is used percent less elapsed percent; `⏵<time>` for the projected run-out when use would pass 100% before the reset; and `↻<time>` for the reset while it is in the future.

#### Scenario: A Deficit with a Run-Out

- **WHEN** `five_hour` is 60% used with 30% of the window gone
- **THEN** the part shows `⇡30%`, a `⏵` run-out time before the reset, and a `↻` reset time

#### Scenario: Too Early for a Pace

- **WHEN** less than 3% of the window has passed
- **THEN** the part shows the percent and the reset only

### Requirement: Subagent Rows

The subagent status line (`--subagent`) SHALL print one JSON line `{id, content}` for each of the first 20 entries of stdin `tasks` that has a string `id`, and SHALL print nothing for input that is not a JSON object. The theme SHALL be read from the session file under stdin `cwd`.

#### Scenario: Skips and Limits

- **WHEN** a task has no `id`, or 25 tasks arrive
- **THEN** the task without an id is skipped, and at most 20 rows print ("a task without an id is skipped, and bad input prints nothing", "at most 20 rows")

### Requirement: A Subagent Row Is Fitted to the Columns

Each `content` SHALL be fitted to stdin `columns` (else `COLUMNS`, else 80) less 4. The `description` SHALL follow the row in dim, cut to the room left, and SHALL be left out when 8 columns or fewer remain.

#### Scenario: Fit to the Columns

- **WHEN** a row is wider than the columns
- **THEN** the description shrinks first, and the row is cut at the width ("a row fits the columns of the input and the description takes what is left")

### Requirement: A Subagent Row Names the Task and Its Context

A row SHALL show `⏵`, the task's `name` in bold, else its agent type, then the agent type in parentheses when it differs from the name (a plugin prefix up to `:` removed), the model without `claude-` and its `effort`, and the context as `◫ <tokens>/<window> <percent>%` in the usage gradient when `tokenCount` is above 0.

#### Scenario: A Running Task

- **WHEN** a task is running with `tokenCount` and `contextWindowSize` set
- **THEN** its row shows the name, the context use, and the run time (`tools/statusline/subagents.test.ts`, "a running task shows its name, context use, and run time")

### Requirement: A Subagent Row Shows the Time or the State

A row SHALL show the time as `◔ <elapsed>` while `status` is `running` or absent, else `✓ done`, `✗ failed`, `stopped`, or the status word.

#### Scenario: A Finished Task

- **WHEN** `status` is `completed`
- **THEN** the row shows `✓ done` in place of the clock ("a finished task shows its state in place of the clock")

### Requirement: Width of the Line

The main line SHALL fit `COLUMNS` less a margin of 4, and SHALL use 80 when `COLUMNS` is absent or not a positive integer. It SHALL always exit 0, and SHALL print `claudetto: no status` when the input is not a JSON object or no item has anything to show.

#### Scenario: A Bad Width

- **WHEN** `COLUMNS` is `abc`
- **THEN** the line fits 76 columns (`tools/statusline/defects.test.ts`, "a missing or bad `COLUMNS` falls back to a width that fits 80 columns")

#### Scenario: Not JSON

- **WHEN** stdin is not JSON
- **THEN** the line prints `claudetto: no status` ("not JSON, empty, and non-object JSON each give one short line")
