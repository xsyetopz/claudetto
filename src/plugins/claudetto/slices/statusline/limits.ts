// The bounds of the `statusline` slice, in one place.
// Tests read these values, so change a bound here and nowhere else.

import { USAGE_LEVELS } from "../../../../kernel/budget.ts";

/** The seconds between two runs of the status line. The countdowns of the limits use it. */
export const REFRESH_SECONDS = 1;

/** The time that the one `git status` call can take. */
export const GIT_TIMEOUT_MS = 1_500;

/** The time, in milliseconds, that a `git status` result stays in the cache of the git segment. The status line runs every `REFRESH_SECONDS`, so a 3-second window runs `git` at most once in three refreshes, and a commit or an edit shows within 3 seconds. A shorter window saves less `git` time, and a longer one shows a stale branch for longer. */
export const GIT_CACHE_MS = 3_000;

/** The part of the handoff trigger, in tokens, within which the context segment has the warning color. */
export const TRIGGER_WARN_FRACTION = 0.1;

/** The most rows of the main status line. */
export const MAX_ROWS = 3;

/** The width in columns when `COLUMNS` is not set, and the columns that stay free at the right edge. */
export const DEFAULT_COLUMNS = 120;
export const COLUMNS_MARGIN = 4;

/** The most subagent rows. Claude Code shows the rows in the panel, so a long list is no help. */
export const SUBAGENT_ROWS_MAX = 20;

/** The text between two items of a row of the main status line and of a subagent row. */
export const ITEM_GAP = " · ";

/** The length, in seconds, of the `5h` window of a limit. */
export const FIVE_HOUR_S = 5 * 60 * 60;

/** The length, in seconds, of the `7d` window of a limit. */
export const SEVEN_DAY_S = 7 * 24 * 60 * 60;

/** The part of a limit window that must pass before its pace arrow shows. */
export const PACE_MIN_FRACTION = 0.03;

/** The projected use at the end of a window, in percent, from which the percent has the warning color. It is the first level of `USAGE_LEVELS`. */
export const PROJECTED_WARN = USAGE_LEVELS[0];

/** The projected use at the end of a window, in percent, above which the percent has the limit color. A projection above it is a run-out before the reset. */
export const PROJECTED_RUNOUT = 100;

/** The columns of the fields of a limit window: the percent, the pace arrow, and the run-out time. The fields keep the windows of two rows in one column. */
export const PERCENT_FIELD = 4;
export const ARROW_FIELD = 5;
export const RUNOUT_FIELD = 14;

/** The columns that a subagent row needs for its description before the description shows. */
export const DESCRIPTION_ROOM_MIN = 8;
