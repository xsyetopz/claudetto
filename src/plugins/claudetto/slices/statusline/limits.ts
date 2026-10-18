// The bounds of the `statusline` slice, in one place. Tests read these values.

import { USAGE_LEVELS } from "../../../../kernel/budget.ts";

/** The seconds between two runs of the status line. The countdowns of the limits use it. */
export const REFRESH_SECONDS = 1;

/** The time that the one `git status` call can take. */
export const GIT_TIMEOUT_MS = 1_500;

/** How long a `git status` result stays cached: one `git` run in three refreshes, and a commit shows within 3 seconds. */
export const GIT_CACHE_MS = 3_000;

/** The part of the handoff trigger within which the context segment has the warning color. */
export const TRIGGER_WARN_FRACTION = 0.1;

export const MAX_ROWS = 3;

/** The width when `COLUMNS` is not set, and the columns that stay free at the right edge. */
export const DEFAULT_COLUMNS = 120;
export const COLUMNS_MARGIN = 4;

/** Claude Code shows the rows in a panel, so a long list is no help. */
export const SUBAGENT_ROWS_MAX = 20;

export const ITEM_GAP = " · ";

export const FIVE_HOUR_S = 5 * 60 * 60;
export const SEVEN_DAY_S = 7 * 24 * 60 * 60;

/** The part of a limit window that must pass before its pace arrow shows. */
export const PACE_MIN_FRACTION = 0.03;

/** From this projected use at the window end, in percent, the percent has the warning color. */
export const PROJECTED_WARN = USAGE_LEVELS[0];

/** Above this projected use the percent has the limit color, because the use runs out before the reset. */
export const PROJECTED_RUNOUT = 100;

/** The columns of the percent, the pace arrow, and the run-out time of a limit window, so that two rows keep one column. */
export const PERCENT_FIELD = 4;
export const ARROW_FIELD = 5;
export const RUNOUT_FIELD = 14;

/** The columns that a subagent row needs for its description before the description shows. */
export const DESCRIPTION_ROOM_MIN = 8;
