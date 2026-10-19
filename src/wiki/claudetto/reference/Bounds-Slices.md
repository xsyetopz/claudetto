# Bounds for Slices

A bound is a fixed limit, such as a timeout or a size.
This page lists the bounds of each slice of the core plugin, with the value and the file.
The shared and repository bounds are on [Bounds](Bounds).

## Advise

| Name | Value | File | Purpose |
| --- | --- | --- | --- |
| `CONTEXT_BYTES` | `24,000` | `src/plugins/claudetto/slices/advise/limits.ts` | The most bytes of context that one `advise` call sends: the question, the plan, the failing checks, and the end of the conversation. |
| `MAX_TOKENS` | `2,048` | `src/plugins/claudetto/slices/advise/limits.ts` | The token cap of one piece of advice. |
| `TIMEOUT_MS` | `120,000` | `src/plugins/claudetto/slices/advise/limits.ts` | The time limit of one `advise` call. |
| `MAX_CALLS_PER_TURN` | `3` | `src/plugins/claudetto/slices/advise/limits.ts` | The most `advise` calls in one turn. |
| `MAX_CALLS_PER_SESSION` | `20` | `src/plugins/claudetto/slices/advise/limits.ts` | The most `advise` calls in one session. |

## Decide

| Name | Value | File | Purpose |
| --- | --- | --- | --- |
| `JEV_TIMEOUT_MS` | `45,000` | `src/plugins/claudetto/slices/decide/limits.ts` | The most time that the hook waits for one run of the TypeSafe client. |
| `TRIES` | `3` | `src/plugins/claudetto/slices/decide/limits.ts` | The tries of the TypeSafe client on a 429 or a 529 reply. |
| `BACKOFF_MS` | `1,000` | `src/plugins/claudetto/slices/decide/limits.ts` | The first wait before a retry, which doubles for each later wait. |
| `ATTEMPT_TIMEOUT_MS` | `12,000` | `src/plugins/claudetto/slices/decide/limits.ts` | The timeout of one try of the TypeSafe client. |
| `ERROR_BODY_MAX` | `200` | `src/plugins/claudetto/slices/decide/limits.ts` | The most characters of an error body of the TypeSafe API that the client keeps. |
| `MIN_OPTIONS` | `2` | `src/plugins/claudetto/slices/decide/limits.ts` | The fewest options of a `pick` question. |
| `MAX_OPTIONS` | `255` | `src/plugins/claudetto/slices/decide/limits.ts` | The most options of a `pick` question. |
| `MIN_CONFIDENCE` | `0.5` | `src/plugins/claudetto/slices/decide/limits.ts` | The confidence under which a Jev answer says that Jev is not sure. |
| `YES_NO_UNSURE_BAND` | `0.2` | `src/plugins/claudetto/slices/decide/limits.ts` | The distance from 0.5 under which a yes or no answer says that Jev is not sure. |

## Goal

| Name | Value | File | Purpose |
| --- | --- | --- | --- |
| `STALL_DEFAULT` | `3` | `src/plugins/claudetto/slices/goal/limits.ts` | The turns in a row with the same failing checks and the same output, after which the goal stops. |
| `OUTPUT_TAIL_CHARS` | `1,500` | `src/plugins/claudetto/slices/goal/limits.ts` | The most characters of a check output that the state keeps and the next turn shows. The tail has the error. |
| `RUN_TIMEOUT_MS` | `300,000` | `src/plugins/claudetto/slices/goal/limits.ts` | The most time that a `run` check may take. |

## Guard

| Name | Value | File | Purpose |
| --- | --- | --- | --- |
| `READ_MAX_BYTES` | `4,194,304` | `src/plugins/claudetto/slices/guard/limits.ts` | The size of the largest file that `$.fs.read` reads, which is 4 MiB. |

## Handoff

| Name | Value | File | Purpose |
| --- | --- | --- | --- |
| `HANDOFF_LINES_MAX` | `10` | `src/plugins/claudetto/slices/handoff/limits.ts` | The most lines of a handoff, as its prompt asks for them. |
| `CALL_INPUT_CHARS_MAX` | `300` | `src/plugins/claudetto/slices/handoff/limits.ts` | The most characters of the input of one tool call that the fork prompt names. |
| `CHARS_PER_TOKEN` | `4` | `src/plugins/claudetto/slices/handoff/limits.ts` | The characters of one token in the estimate of the size of the new context. |
| `CACHE_TTL_MS` | `3,600,000` | `src/plugins/claudetto/slices/handoff/limits.ts` | The prompt cache TTL of a root session, 1 hour. A handoff after it needs no model call. |
| `COLD_FILES_MAX` | `20` | `src/plugins/claudetto/slices/handoff/limits.ts` | The most changed files that a cold handoff names. |
| `COLD_PROMPTS_MAX` | `3` | `src/plugins/claudetto/slices/handoff/limits.ts` | The most user messages that a cold handoff quotes. |
| `COLD_PROMPT_CHARS_MAX` | `1,500` | `src/plugins/claudetto/slices/handoff/limits.ts` | The most characters of the task and of one quoted user message in a cold handoff. |

## Patch

| Name | Value | File | Purpose |
| --- | --- | --- | --- |
| `GIT_TIMEOUT_MS` | `60,000` | `src/plugins/claudetto/slices/patch/limits.ts` | The time that one `git` run of the `patch` slice may take. |

## Reply

| Name | Value | File | Purpose |
| --- | --- | --- | --- |
| `QUOTE_MAX_LINES` | `12` | `src/plugins/claudetto/slices/reply/limits.ts` | The most lines of a message that a `Reply` quote holds. A longer message keeps its first lines. |

## Status Line

| Name | Value | File | Purpose |
| --- | --- | --- | --- |
| `REFRESH_SECONDS` | `1` | `src/plugins/claudetto/slices/statusline/limits.ts` | The seconds between two runs of the status line. |
| `TRIGGER_WARN_FRACTION` | `0.1` | `src/plugins/claudetto/slices/statusline/limits.ts` | The part of the handoff trigger within which the context shows in the warning color. |
| `GIT_TIMEOUT_MS` | `1,500` | `src/plugins/claudetto/slices/statusline/limits.ts` | The time that the one `git status` call can take. |
| `MAX_ROWS` | `{{MAX_ROWS}}` | `src/plugins/claudetto/slices/statusline/limits.ts` | The most rows of the main status line. |
| `DEFAULT_COLUMNS` | `120` | `src/plugins/claudetto/slices/statusline/limits.ts` | The width in columns when `COLUMNS` is not set. |
| `COLUMNS_MARGIN` | `4` | `src/plugins/claudetto/slices/statusline/limits.ts` | The columns that stay free at the right edge. |
| `SUBAGENT_ROWS_MAX` | `20` | `src/plugins/claudetto/slices/statusline/limits.ts` | The most subagent rows in the status line. |
| `DESCRIPTION_ROOM_MIN` | `8` | `src/plugins/claudetto/slices/statusline/limits.ts` | The columns that a subagent row needs for its description before the description shows. |
| `GIT_CACHE_MS` | `3,000` | `src/plugins/claudetto/slices/statusline/limits.ts` | The time that a `git status` result stays in the cache of the git segment. |
| `FIVE_HOUR_S` | `18,000` | `src/plugins/claudetto/slices/statusline/limits.ts` | The length, in seconds, of the `5h` window of a limit. |
| `SEVEN_DAY_S` | `604,800` | `src/plugins/claudetto/slices/statusline/limits.ts` | The length, in seconds, of the `7d` window of a limit. |
| `PACE_MIN_FRACTION` | `0.03` | `src/plugins/claudetto/slices/statusline/limits.ts` | The part of a limit window that must pass before its pace arrow shows. |
| `PROJECTED_WARN` | `75` | `src/plugins/claudetto/slices/statusline/limits.ts` | The projected use at the end of a window, in percent, from which the percent has the warning color. It is the first level of `USAGE_LEVELS`. |
| `PROJECTED_RUNOUT` | `100` | `src/plugins/claudetto/slices/statusline/limits.ts` | The projected use at the end of a window, in percent, above which the percent has the limit color. |
| `PERCENT_FIELD` | `4` | `src/plugins/claudetto/slices/statusline/limits.ts` | The columns of the percent field of a limit window. |
| `ARROW_FIELD` | `5` | `src/plugins/claudetto/slices/statusline/limits.ts` | The columns of the pace arrow field of a limit window. |
| `RUNOUT_FIELD` | `14` | `src/plugins/claudetto/slices/statusline/limits.ts` | The columns of the run-out time field of a limit window. |

## See Also

- [Bounds](Bounds)
- [Bounds for Add-Ons](Bounds-Add-Ons)
- [Advise](Advise)
- [Decide](Decide)
- [Goal](Goal)
- [Guard](Guard)
- [Handoff](Handoff)
- [Patch](Patch)
- [Reply](Reply)
- [Status Line](Status-Line)
