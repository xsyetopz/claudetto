# Status line

This page is a draft for dotclaude 0.28.0.
It shows what the main and subagent status lines display, how each value is computed, and where the data comes from.
The code is in `plugins/dotclaude/features/statusline/`.
The bounds are in `features/statusline/limits.mjs`.

## Sources of the field names

Each input field is checked against the strings of the Claude Code 2.1.294 bundle.
`features/statusline/input.mjs` lists the byte offsets.

## Rules

- The status line calls no model and no network.
  It runs no program except `git`.
- It writes only its own files in the temporary folder.
- Text that is not JSON gives an empty line and exit code 0.
- Claude Code runs it again every `refreshInterval` seconds, so the countdowns stay current.
  The blinking glyph changes on each run.

## Main status line

The segments are in the order of the vanilla Claude Code footer.
Row 1 has the model and the context, the next row has the usage, and the place comes after the usage.
Each segment has an icon from one set of single-column symbols.
There is no emoji, because an emoji can take two columns.
A segment of an absent field is not shown.

| Segment | Icon | Source |
| --- | --- | --- |
| Model, effort, thinking | none | `model`, `effort.level`, `thinking.enabled` |
| Context and headroom | `◧` `⇥` | `context_window` against `CONTEXT_WINDOW` |
| Cache time left, hit ratio, misses | `◷` `◌` `✘` | `prompt_cache` |
| 5-hour, 7-day, and spend limits | none | `rate_limits` |
| Pace and run-out time | `▲` `▼` `⏵` | derived from `rate_limits` |
| Reset time of a limit | `↻` | `rate_limits[*].resets_at` |
| Burn rate and used reset | `ϟ` `↺` | samples in the temporary folder |
| Reset credits | `⟳` | usage cache of Claude Code |
| Cost and lines for each hour | none | `cost` |
| Folder and repository | `▣` `⌂` | `workspace.current_dir`, `workspace.repo` |
| Branch, dirty files, ahead, behind | `⎇` `±` `↑` `↓` | one `git` call |
| Worktree | `⊞` | `worktree`, `workspace.git_worktree` |
| Pull request, with a link | `⇄` | `pr` |
| OpenSpec change and task count | `▤` | `openspec/changes/<name>/tasks.md` |
| Agent, output style, vim mode, session name | `@` `✎` `Ⓥ` | `agent`, `output_style`, `vim`, `session_name` |

Percentages use one color scale.
They are green, yellow from the first value of `USAGE_LEVELS`, and red from the second value.
A meter bar of 5 cells shows the percentage.
`NO_COLOR` removes the colors and keeps the icons, the bars, and the links.

## Three columns

When the columns fit in `COLUMNS`, the main status line is a grid of 3 columns and up to 3 rows (design D33).
Each column is as wide as its widest cell, and a fixed gap (`GRID_GAP`) separates the columns.
An empty cell stays blank, and a column with no cells is left out.

| Column | Row 1 | Row 2 | Row 3 |
| --- | --- | --- | --- |
| Left | `◆` model, effort, `∴` | `▤` OpenSpec change, else `▣` folder | `✓` done and total tasks, `⎇` branch |
| Middle | `◧` context meter | `⊛` system and tools, `☰` memory | `✦` skills and agents, `❝` messages, `◇` free |
| Right | `5h` window | `7d` window | `✧` Fable window |

The other segments (cache, burn rate, cost, lines, pull request, worktree, repository, credits, and so on)
go at the end of a cell of the column that fits them.
They stay only while the grid fits `COLUMNS`, and the segment of lowest priority goes first.
When the grid is still too wide with no other segment, the status line uses the row packing of "Width" below.
The 3 columns need about 130 columns.

### Context breakdown

The status input has only totals, so the middle column reads the transcript at `transcript_path`.
The read starts at the first byte, goes line by line, and stops at the first `assistant` record
that is not `isSidechain` and has `message.usage`.
It reads at most `TRANSCRIPT_BYTES_MAX` bytes.

| Part | Source | Exact |
| --- | --- | --- |
| Start size | `input_tokens` + `cache_creation_input_tokens` + `cache_read_input_tokens` of that `usage` | yes |
| `☰` memory | `attachment.files[].content` of the `instructions` attachment | estimate |
| `✦` skills and agents | `content` of `skill_listing` and `addedLines` of `agent_listing_delta` | estimate |
| `⊛` system and tools | start size minus the memory, skills, and agents estimates, never below 0 | estimate |
| `❝` messages | `context_window.total_input_tokens` minus the start size, never below 0 | yes |
| `◇` free | `CONTEXT_WINDOW` minus `CONTEXT_BLOCK_MARGIN` minus `total_input_tokens`, never below 0 | yes |

An estimate is the characters divided by the divisor of the local estimate of `/context` in the 2.1.295 bundle, and it shows with a `~`.
The divisor is `CHARS_PER_TOKEN` (3), and `CHARS_PER_TOKEN_LEGACY` (4) for a model in `LEGACY_TOKENIZER_MODELS`, such as Haiku 4.5.
The system and tools part also holds the other start attachments, so it shows with a `~` too.
Claude Code counts each `/context` category with the count-tokens API.
A script cannot rebuild the system prompt and the tool definitions, so this line does not match `/context` to the token.
`CONTEXT_BLOCK_MARGIN` in `features/statusline/limits.mjs` is a copy of the one in `features/context/limits.mjs`, and a test pins the copy.

The result stays in the private folder, in a file for each `session_id`, so the transcript is read one time for each session.

### Exact parts from `/context`

`/context` writes its table into the transcript as a `user` record whose content starts with `## Context Usage`.
When the transcript has such a record that is not `isSidechain`, the middle column uses the rows of the newest one, with no `~`.

| Part | Rows of the `/context` table |
| --- | --- |
| `⊛` system and tools | `System prompt` + `System tools` |
| `☰` memory | `Memory files` |
| `✦` skills and agents | `Skills` + `Custom agents` |
| `❝` messages | `total_input_tokens` minus the 3 parts above, never below 0 |

`System tools (deferred)` is not a part, because the `Tokens` total of `/context` does not include the deferred tools.
The rows are as exact as `/context`, and they are from the time of the run, so a memory file that changed later is not in them.
Each run reads only the bytes after the kept offset, at most `TABLE_TAIL_BYTES_MAX`.
The offset and the newest table stay in the private folder, in a file for each `session_id`.
A transcript with no table keeps the estimates of the section above.
A read that finds no `usage` is not kept unless it hit the byte cap, so the first request is found when it comes.
When `transcript_path` is missing, the file is not readable, or the transcript has no `usage`,
the middle column shows the meter and the free tokens only.
Any read error gives that same result.

### Fable window

The `✧` cell shows the weekly window of Fable 5.1 with its meter, percent, and reset time (`↻`).
The status input has no model-scoped window.
The value comes from `cachedUsageUtilization.utilization.limits[]` in `<config dir>/.claude.json`.
The row has `kind` `weekly_scoped` and `scope.model.display_name` `Fable`.
Its `percent` is the used percent, and `resets_at` is an ISO 8601 string.
The cell is hidden when the row is absent or `fetchedAtMs` is older than 1 hour (`FABLE_MAX_AGE_MS`).
The file is read one time for each run for the credits and for this window, and no other key is used.

## Formulas

The times are in seconds.

- Context headroom is `CONTEXT_WINDOW` minus the context tokens, and never below 0.
- The elapsed part of a limit window is `(span - left) / span`.
  `span` is 5 hours or 7 days, and `left` is `resets_at - now`.
- The deficit is the used percentage minus the elapsed percentage.
  A negative value is a reserve.
  Pace and run-out time are not shown while less than 3% of the window passed.
- The run-out time is `now + (100 - used) * elapsed_seconds / used`.
  It is shown only when it is before `resets_at`, in yellow, or in red from the first value of `USAGE_LEVELS`.
- The burn rate of the 5-hour limit is the change in percent between the oldest and the newest sample
  of the last hour, divided by the time between them.
- Cost for each hour is `total_cost_usd / hours`.
  Lines for each hour are added plus removed lines divided by `hours`.
  `hours` is `cost.total_duration_ms` in hours.
  Neither rate is shown for a session of less than 1 minute (`RATE_MIN_MS`).
  A rate from a few seconds of work is a large number with no meaning, so the line waits for a longer base.
- The cache hit is `prompt_cache.hit_ratio`.
  Misses by idle time past the TTL and by a model switch are not counted.
  The cache segment blinks a warning glyph when less than 2 minutes remain.

## Burn-rate samples

The status line keeps one JSON file for each account window in the temporary folder, named `dotclaude-burn-<account hash>-<resets_at hash>.json`.
The account hash is of the config folder, and the other hash is of the `resets_at` of the 5-hour limit.
The file holds up to 50 samples and a used-reset mark.

- A sample is added after 60 seconds or when the percentage changes.
- A new `resets_at` makes a new file and removes the files of the old windows of the same account.
- A drop of the percentage inside a window means that the user used a reset.
  The samples start again, and the line shows `↺ reset used`.

## Reset credits

The credit count and the next expiry come from `cachedUsageUtilization.utilization.cedar_ember`
in `<config dir>/.claude.json`.
This cache is not a documented interface, so the parser accepts only one known shape.
A test pins that shape with a fixture.

- The block must have `eligible: true` and a `grants` array.
- A grant counts when `paused` is false, `usable_now` is true, `resets_left` is a positive integer, and now is between `starts_at` and `ends_at`.
- A cache that is older than 1 hour is not used.
- If the file is absent or has another shape, the segment is hidden and the line prints with no error.

## Git

One `git --no-optional-locks status --porcelain=v2 -b` call gives the branch, the dirty count, and the ahead and behind counts.
The call has a time limit (`GIT_TIMEOUT_MS`).
The result is cached for `STATUS_CACHE_MS`, also when the call fails.
If `git` does not answer, the line has no git segment and still prints.

## Width

The status line reads the width from `COLUMNS` and keeps 4 columns free.
It prints at most 3 rows.
When the 3 columns do not fit, it packs the segments into rows.
When the packed segments do not fit, it drops the segment of lowest priority first.
The model and the context have the highest priority.

## Subagent status line

The subagent status line prints one JSON row, `{id, content}`, for each running subagent in the `tasks` input.
A row shows the name, the agent type, the model and effort, the context against `CONTEXT_WINDOW`, the run time, and the description.
The agent type and the context window come from the `agentType` and `contextWindowSize` fields of the task.
Only tasks with the status `running` get a row.
A failure prints nothing, so Claude Code keeps its default rows.
