# Status Line

This page describes the main and subagent status lines of the core plugin `claudetto`.
It says what each segment shows, how the colors work, and how a failure shows.
It is for a user who reads the status line and for a contributor who edits the `statusline` slice.

## The Commands

The `statusLine` command is `bun --no-env-file "<plugin folder>/bin/claudetto-statusline"`.
The `subagentStatusLine` command is the same command with `--subagent`.
See [Settings Snippet](Settings-Snippet) for the setup.
The profile sets `statusLine.refreshInterval`, so Claude Code runs the command each `REFRESH_SECONDS` seconds.
The command calls no model and no network, and no program except `git`.

## The Segments

The main line has up to three rows.
A segment with no input is out.
A field with a wrong type shows `✗` and not an empty value.

| Row | Segment | Example | What it shows |
| --- | --- | --- | --- |
| 0 | Folder | `⌂ claudetto` | The last part of the working folder. |
| 0 | Git | `⎇ main ✎2 ↑1 ↓2` | The branch, the dirty files, and the commits ahead and behind. |
| 0 | Pull request | `⇄ #12 approved` | The number and the review state. A merge request shows `!`. |
| 0 | Change | `◆ add-login 4/13 ▸5.1` | The active MiniSpec change. |
| 0 | 7-day limit | `◷ 7d 80% ▲11%` | The use of the window, the pace, and the reset. |
| 1 | Model | `◈ Opus 5.5 high ✦` | The model, the effort, and the thinking mark. |
| 1 | Context | `▤ 12% of 1M ⇥105k` | The context and the distance to the handoff. |
| 1 | Cost | `$1.23 +300 -20` | The cost and the lines added and removed. |
| 1 | 5-hour limit | `◷ 5h 23% ▼13%` | The use of the window, the pace, and the reset. |
| 2 | Spend limit | `◷ spend 40%` | The use of the spend limit. |
| 2 | Prompt cache | `⌁ 4m` or `⌁ cold +120k` | The cache state. |

### Context

The context shows `used_percentage` and `context_window_size` as Claude Code gives them.
The window is never a fixed value, so a 1M window shows `of 1M`.
The segment is out before the first message, when `used_percentage` is `null`.

The number after `⇥` is the tokens that are left before the handoff starts.
The trigger is `HANDOFF_TRIGGER_TOKENS`, or `HAIKU_HANDOFF_TRIGGER_TOKENS` for a Haiku model.
With the `built-in` value of the `compaction` option, the icon is `⇲` and the number is the distance to the compaction threshold.
The segment reads that option from the env var `CLAUDE_PLUGIN_OPTION_COMPACTION`, or else from `pluginConfigs` in the user `settings.json`.
Claude Code gives the env var to plugin hooks only, so the status line command usually reads the settings file.
When neither has the option, the segment shows the handoff.
The text `now` replaces the number when the context is at the trigger or above it.

### Change

The change segment reads `minispec/changes/` in the project folder.
The active change is the first change by name that has an open task, and else the first change by name.
The `archive` folder is not a change.

| State | Text |
| --- | --- |
| Proposal only | `◆ name planning` |
| Open tasks | `◆ name 4/13 ▸5.1`, with the next open task |
| All tasks done | `◆ name 13/13 ✓` |
| `tasks.md` cannot be read | `◆ name ✗`, and the cause on stderr |

### Prompt Cache

A warm cache shows the time to `prompt_cache.expires_at`.
A cold cache shows `cold`, and `recache_tokens_if_cold` when Claude Code gives it.
When `caching_observed` is `false`, the segment is out.

### Subagents

The subagent line shows the agent type, the model, the context percent against the window of the task, and the run time.
A task with no valid window size shows the tokens only.

## The Colors

Each color has a meaning, and the meaning is the same in each segment.

| Meaning | Role | Where |
| --- | --- | --- |
| Normal | `success` | A low use, a warm cache, and an even or reserve pace. |
| Warning | `warning` | A use that is near a bound, a dirty tree, and a deficit pace. |
| Limit | `error` | A use at a bound, a run-out, and the error mark `✗`. |
| Cold, labels | `inactive` | A cold cache. |
| Branch | `merged` | The branch name. |
| Model | `claude` | The model name. |

The context turns to the warning color within 10% of the trigger (`TRIGGER_WARN_FRACTION`), and to the limit color at the trigger.
A pull request has the color of its review state.

The colors follow the built-in theme of Claude Code.
The status line reads the `theme` key of `.claude.json` in `CLAUDE_CONFIG_DIR`, or in the home folder.

| Theme | Colors |
| --- | --- |
| `dark`, and any name that is not built in | The values of the `dark` theme. |
| `light` | The values of the `light` theme. |
| `dark-daltonized`, `light-daltonized` | The values of that theme. |
| `dark-ansi`, `light-ansi` | The 16 ANSI colors, with ANSI 35 for the branch. |

`NO_COLOR` with a value that is not empty turns off all color.

## Failures

A failure never stops the status line.
The command prints an empty row, or the default look of Claude Code for subagents, exits with 0, and writes the cause to stderr.

- A `git` that times out, is missing, or exits with an error shows `⎇ ✗`.
  A folder that is no repository shows no git segment.
  The segment reads the exit code of `git`, not its message, so the language of `git` does not matter.
  After a `git status` that exits with 128, one `git rev-parse --git-dir` tells a failure in a repository from a folder with no repository.
- Input that is not a JSON object prints an empty row and the cause on stderr.
- A cache file or a config file that cannot be read goes to stderr, and the segment uses its default.

## Related Pages

- [Overview](Overview): the plugins and their parts.
- [Settings Snippet](Settings-Snippet): the `statusLine` and `subagentStatusLine` keys.
- [Bounds](Bounds): the bounds of the slice.
