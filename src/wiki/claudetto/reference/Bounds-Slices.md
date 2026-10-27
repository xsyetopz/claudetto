# Bounds for Slices

A bound is a fixed limit, such as a timeout or a size.
This page lists the bounds of each slice of the core plugin, with the value and the file.
The shared and repository bounds are on [Bounds](Bounds).

## Decide

| Name | Value | File | Purpose |
| --- | --- | --- | --- |
| `TRIES` | `3` | `plugins/claudetto/modules/jev/limits.ts` | The tries of the TypeSafe client on a 429 or a 529 reply. |
| `BACKOFF_MS` | `1,000` | `plugins/claudetto/modules/jev/limits.ts` | The first wait before a retry, which doubles for each later wait. |
| `ATTEMPT_TIMEOUT_MS` | `12,000` | `plugins/claudetto/modules/jev/limits.ts` | The timeout of one try of the TypeSafe client. |
| `ERROR_BODY_MAX` | `200` | `plugins/claudetto/modules/jev/limits.ts` | The most characters of an error body of the TypeSafe API that the client keeps. |
| `MIN_OPTIONS` | `2` | `plugins/claudetto/modules/jev/limits.ts` | The fewest options of a `pick` question. |
| `MAX_OPTIONS` | `255` | `plugins/claudetto/modules/jev/limits.ts` | The most options of a `pick` question. |
| `MIN_CONFIDENCE` | `0.5` | `plugins/claudetto/modules/jev/limits.ts` | The confidence under which a Jev answer says that Jev is not sure. |
| `YES_NO_UNSURE_BAND` | `0.2` | `plugins/claudetto/modules/jev/limits.ts` | The distance from 0.5 under which a yes or no answer says that Jev is not sure. |
| `APPROVAL_MAX` | `0.2` | `plugins/claudetto/modules/jev/limits.ts` | The most `P(yes)` of the approval question for a pick that Jev may answer. |

## Guard

| Name | Value | File | Purpose |
| --- | --- | --- | --- |
| `GIT_TIMEOUT_MS` | `5,000` | `plugins/claudetto/modules/gate/limits.ts` | The most time of one `git` run that gives the gate the state of a path. A slower run fails the gate, and a person decides. |
| `JEV_YES_MIN` | `0.8` | `plugins/claudetto/modules/gate/limits.ts` | The least `P(yes)` of Jev that allows a call. It is `1 - APPROVAL_MAX` of the `decide` slice. |

## Hygiene

| Name | Value | File | Purpose |
| --- | --- | --- | --- |
| `PROBE_MAX_AGE_MIN` | `60` | `plugins/claudetto/modules/session/hygiene/limits.ts` | The age in minutes after which a `fswatch-probe-*` folder is a leftover. |
| `SWEEP_TIMEOUT_MS` | `60,000` | `plugins/claudetto/modules/session/hygiene/limits.ts` | The most time of the one `find` run that removes the leftover probe folders. |
| `LEDGER_MAX_FILES` | `200` | `plugins/claudetto/modules/session/hygiene/limits.ts` | The most files in the edit ledger. The oldest entry goes first. |
| `LEDGER_WRITE_TRIES` | `5` | `plugins/claudetto/modules/session/hygiene/limits.ts` | The most times that a write of the ledger runs again after another write landed first. |
| `DEFAULT_CLEANUP_DAYS` | `30` | `plugins/claudetto/modules/session/hygiene/limits.ts` | The age in days over which a session folder is old, when `cleanupPeriodDays` is not set. |
| `WORKTREES_DIR` | `.claude/worktrees` | `plugins/claudetto/modules/session/hygiene/limits.ts` | The folder of the worktrees of Claude Code, under the project root. |

## Setup

| Name | Value | File | Purpose |
| --- | --- | --- | --- |
| `PLAN_CAPS` | `claude_pro` 3, `default_claude_max_5x` 4, `default_claude_max_20x` 5 | `plugins/claudetto/modules/setup/limits.ts` | The cap of subagents at one time for each plan. Setup writes it as `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS`. A tier that the table lacks gets no cap. |

## Finish

| Name | Value | File | Purpose |
| --- | --- | --- | --- |
| `OUTPUT_TAIL_CHARS` | `1,500` | `plugins/claudetto/modules/work/finish/limits.ts` | The most characters of a check output that the state keeps and the next turn shows. The tail has the error. |
| `RUN_TIMEOUT_MS` | `300,000` | `plugins/claudetto/modules/work/finish/limits.ts` | The most time that a `run` check may take. |
| `GOAL_BLOCKS_MAX` | `5` | `plugins/claudetto/modules/work/finish/limits.ts` | The most re-blocks of the `/goal` stop in a row. Then the stop goes on, with a line to the user. |
| `GIT_TIMEOUT_MS` | `10,000` | `plugins/claudetto/modules/work/finish/limits.ts` | The most time that the `git status` call of the `Stop` hook may take. |
| `NOTE_ITEM_CHARS` | `80` | `plugins/claudetto/modules/work/finish/limits.ts` | The most characters of the deferred item in a note. |
| `NOTE_FILES_MAX` | `5` | `plugins/claudetto/modules/work/finish/limits.ts` | The most file names in the line of a note. |

## Notes

| Name | Value | File | Purpose |
| --- | --- | --- | --- |
| `NOTE_PROMPTS` | `2` | `plugins/claudetto/modules/work/notes/limits.ts` | The prompts that a note stays above the prompt. |
| `REPEAT_MIN` | `3` | `plugins/claudetto/modules/work/notes/limits.ts` | The equal denies, asks, or failing checks in a row that set a note. |
| `BACKOFF_FROM` | `3` | `plugins/claudetto/modules/work/notes/limits.ts` | The ignored notes in a row from which the back-off starts. |
| `SKIP_MAX` | `16` | `plugins/claudetto/modules/work/notes/limits.ts` | The most checks that the back-off skips. |
| `RECENT_MAX` | `50` | `plugins/claudetto/modules/work/notes/limits.ts` | The last note lines that a new line is compared with. |
| `SIGN_CHARS` | `100` | `plugins/claudetto/modules/work/notes/limits.ts` | The most characters of the failing test line in a note. |

## Handoff

| Name | Value | File | Purpose |
| --- | --- | --- | --- |
| `CHARS_PER_TOKEN` | `4` | `plugins/claudetto/modules/session/handoff/limits.ts` | The characters of one token in the estimate of the size of the new context. |
| `CACHE_TTL_MS` | `3,600,000` | `plugins/claudetto/modules/session/handoff/limits.ts` | The prompt cache TTL of a root session, 1 hour. A handoff after it needs no model call. |
| `COLD_FILES_MAX` | `20` | `plugins/claudetto/modules/session/handoff/limits.ts` | The most changed files that a cold handoff names. |
| `COLD_PROMPTS_MAX` | `3` | `plugins/claudetto/modules/session/handoff/limits.ts` | The most user messages that a cold handoff quotes. |
| `COLD_PROMPT_CHARS_MAX` | `1,500` | `plugins/claudetto/modules/session/handoff/limits.ts` | The most characters of the task and of one quoted user message in a cold handoff. |

## Status Line

| Name | Value | File | Purpose |
| --- | --- | --- | --- |
| `REFRESH_SECONDS` | `1` | `plugins/claudetto/modules/statusline/limits.ts` | The seconds between two runs of the status line. |
| `TRIGGER_WARN_FRACTION` | `0.1` | `plugins/claudetto/modules/statusline/limits.ts` | The part of the handoff trigger within which the context shows in the warning color. |
| `GIT_TIMEOUT_MS` | `1,500` | `plugins/claudetto/modules/statusline/limits.ts` | The time that the one `git status` call can take. |
| `MAX_ROWS` | `{{MAX_ROWS}}` | `plugins/claudetto/modules/statusline/limits.ts` | The most rows of the main status line. |
| `DEFAULT_COLUMNS` | `120` | `plugins/claudetto/modules/statusline/limits.ts` | The width in columns when `COLUMNS` is not set. |
| `COLUMNS_MARGIN` | `4` | `plugins/claudetto/modules/statusline/limits.ts` | The columns that stay free at the right edge. |
| `SUBAGENT_ROWS_MAX` | `20` | `plugins/claudetto/modules/statusline/limits.ts` | The most subagent rows in the status line. |
| `DESCRIPTION_ROOM_MIN` | `8` | `plugins/claudetto/modules/statusline/limits.ts` | The columns that a subagent row needs for its description before the description shows. |
| `GIT_CACHE_MS` | `3,000` | `plugins/claudetto/modules/statusline/limits.ts` | The time that a `git status` result stays in the cache of the git segment. |
| `READING_KEEP_MS` | `60,000` | `plugins/claudetto/modules/statusline/limits.ts` | The time that a saved limit reading with the same window stays as it is, so that a refresh writes no file. |
| `FIVE_HOUR_S` | `18,000` | `plugins/claudetto/modules/statusline/limits.ts` | The length, in seconds, of the `5h` window of a limit. |
| `SEVEN_DAY_S` | `604,800` | `plugins/claudetto/modules/statusline/limits.ts` | The length, in seconds, of the `7d` window of a limit. |
| `PACE_MIN_FRACTION` | `0.03` | `plugins/claudetto/modules/statusline/limits.ts` | The part of a limit window that must pass before its pace arrow shows. |
| `PROJECTED_RUNOUT` | `100` | `plugins/claudetto/modules/statusline/limits.ts` | The projected use at the end of a window, in percent, above which the use runs out before the reset. |
| `ALIGNED_ROWS` | `2` | `plugins/claudetto/modules/statusline/limits.ts` | The first rows of the main status line that share columns. |
| `GRADIENT_GREEN_PERCENT` | `20` | `plugins/claudetto/modules/statusline/limits.ts` | The usage percent of the green stop of the color gradient. Below it the color stays green. |
| `GRADIENT_AMBER_PERCENT` | `60` | `plugins/claudetto/modules/statusline/limits.ts` | The usage percent of the amber stop of the color gradient. |
| `GRADIENT_RED_PERCENT` | `90` | `plugins/claudetto/modules/statusline/limits.ts` | The usage percent of the red stop of the color gradient. Above it the color stays red. |

## Related Pages

- [Bounds](Bounds)
- [Bounds for Add-Ons](Bounds-Add-Ons)
- [Decide](Decide)
- [Finish](Finish)
- [Notes](Notes)
- [Guard](Guard)
- [Session Hygiene](Hygiene)
- [Spec](Spec)
- [Setup](Setup)
- [Handoff](Handoff)
- [Status Line](Status-Line)
