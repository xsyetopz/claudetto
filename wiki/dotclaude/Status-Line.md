# Status Line

This page explains what the status line shows, and how the plugin draws and saves it.
It is for a user who sets the status line, and for a contributor who edits the `statusline` slice.
The status line shows the state of the session under the prompt.
The main line has up to three rows.
A second command draws one row for each running subagent.

Both commands run the launcher `bin/dotclaude-statusline`.
The `statusline` slice holds the code in `src/plugins/dotclaude/slices/statusline/`.
The rationale is in [Decisions](Decisions).

## What Each Row Shows

The rows are set in `segments.ts`, and each segment has a row number.
`MAX_ROWS` in `limits.ts` caps the rows at `3`.

| Row | Segments, from the left |
| --- | --- |
| 0, the place | Folder, git state, and the active change |
| 1, the session | Model and effort, context window, and cost |
| 2, the limits | 5-hour limit, 7-day limit, and spend limit |

- The folder segment shows the base name of `workspace.current_dir`.
  It uses the first value that is set, in this order: `workspace.current_dir`, then `cwd`, then the process folder.
- The git segment shows the branch, the dirty files, and the commits ahead and behind.
  It runs one `git` call, `status --porcelain=v2 -b` (`GIT_ARGS` in `domain/git.ts`).
  The call stops after `GIT_TIMEOUT_MS`, which is `1_500` milliseconds.
  The segment keeps the result of the call for `GIT_CACHE_MS`, which is `3_000` milliseconds, in a file for each repository.
  The files are in the folder `dotclaude-git-<uid>` of the temp folder.
  The folder is made with mode `0700`.
  A folder with another owner, or with group or other mode bits, is not used, so `git` runs at each refresh.
  With no user id, as on Windows, the folder is `dotclaude-git`, because the temp folder there is a folder of the user.
  A link in place of the folder is not used.
  So `git` runs at most once in three refreshes, and a commit shows in 3 seconds or less.
  A saved result with a field of the wrong type, or a branch name with a control character, is no cache, so `git` runs.
- The change segment shows the id and the done and total count of the active change.
  It reads the spec store through `activeProgress` in `src/kernel/spec-store.ts`.
- The model segment shows a name from the model id, such as `Opus 5.5`.
  It adds the effort level.
  It adds an icon when thinking is on.
- The context segment shows the input tokens of the window, the window size, and the percent.
- The cost segment shows the total cost in dollars.
  It adds the lines added and removed when either count is above zero.
- A limit segment shows the percent used and the time to the reset.
  A reset time shows only when it is in the future.

The plugin omits each segment that has no value.
The icons are single-column characters from `icons.ts`.

## Colors

`color.ts` gives each percent one of three colors.
The two steps are the values of `USAGE_LEVELS` in `src/kernel/budget.ts`, which are `75` and `90`.
A percent at or above `90` is red.
A percent at or above `75` is yellow.
Any other percent is green.

`NO_COLOR` disables each color, and the icons stay.
The variable counts as set when it is not empty.

## Width

The width is the `COLUMNS` variable.
When `COLUMNS` is not set, the width is `DEFAULT_COLUMNS` (`120`).
The status line keeps `COLUMNS_MARGIN` (`4`) columns free at the right edge.

`fitRow` in `domain/rows.ts` joins the segments of a row with `SEGMENT_GAP`, which is two spaces.
When the row is too wide, the segments at the right go first.
When one segment is still too wide, the row cuts it.

## Main Command

`adapters/cli.ts` reads the status object from stdin.
It does these steps:

1. It parses the JSON with `parseInput`.
   Text that is not a JSON object gives an empty output.
2. It renders up to `MAX_ROWS` rows with `renderRows` in `domain/rows.ts`.
3. It saves the last `rate_limits` of the object when they change (see the next section).

The command makes no model call and no network call.
It runs no program except `git`.
A failure prints an empty row on stdout and the cause on stderr.
The status line then remains on screen.

Claude Code runs the command again every `REFRESH_SECONDS` seconds, which is `1` in `limits.ts`.
The countdowns of the limits use this refresh.

## Usage Sample

The command keeps one file of the last usage, at `RATE_LIMITS_FILE` (`.dotclaude/rate-limits.json`).
The file is in the project folder, which is `workspace.project_dir`.
When that is not set, the folder is `workspace.current_dir`.
If that is not set either, the folder is the `cwd` field of the status object.
If that is not set, the folder is the folder of the process.
The file holds `savedAt` and the `rate_limits` of the status object.
The `spec` slice reads this file for `dotclaude-spec runs`.

`usageChanged` in `domain/usage.ts` decides when to write the file.
It writes when:

- no sample exists, or the saved file is not a sample.
- the `rate_limits` differ from the saved values.
- the saved sample is older than `USAGE_REWRITE_MS`, which is 5 minutes.

A sample with equal values and a fresh time is not written again.

## Subagent Command

Run `bin/dotclaude-statusline --subagent` for the `subagentStatusLine` setting.
`adapters/subagents.ts` reads the tasks object from stdin.
It writes one JSON row for each running subagent.
It writes at most `SUBAGENT_ROWS_MAX` rows, which is `20`.

Each row shows the agent type, without the plugin prefix, and the description.
The description shows only when `DESCRIPTION_ROOM_MIN` (`8`) columns are free for it.

## Settings

`slice.ts` defines the two settings.

| Setting | Command | Other keys |
| --- | --- | --- |
| `statusLine` | `bun --no-env-file "<plugin folder>/bin/dotclaude-statusline"` | `padding` `0`, `refreshInterval` `1`, `hideVimModeIndicator` `true` |
| `subagentStatusLine` | the same command with `--subagent` | none |

`/dotclaude:setup` replaces `<plugin folder>` with the folder of the installed plugin.
The launcher is named by its path.
The `bin/` folder is not on the `PATH` of a status line.

## Related Pages

- [Architecture](Architecture): the slices and the hook module.
- [Decisions](Decisions): the choices behind the status line.
