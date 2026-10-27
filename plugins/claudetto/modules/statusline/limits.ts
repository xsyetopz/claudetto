// The bounds of the `statusline` slice, in one place. Tests read these values.
/** The seconds between two runs of the status line. The countdowns of the limits use it. */
export const REFRESH_SECONDS = 1;
/** The time that the one `git status` call can take. */
export const GIT_TIMEOUT_MS = 1500;
/** How long a `git status` result stays cached: one `git` run in three refreshes, and a commit shows within 3 seconds. */
export const GIT_CACHE_MS = 3000;
/** How long a saved limit reading with the same window stays as it is, so a refresh writes no file. Its age is in minutes. */
export const READING_KEEP_MS = 60_000;
/** The part of the handoff trigger within which the context segment has the warning color. */
export const TRIGGER_WARN_FRACTION = 0.1;
/** The fixed rows: the place, the session, the limits, and the cache. */
export const MAX_ROWS = 4;
/** The rows that share columns: the place and the session have 3 places each. */
export const ALIGNED_ROWS = 2;
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
/** Above this projected use at the window end, in percent, the use runs out before the reset. */
export const PROJECTED_RUNOUT = 100;
/** The columns that a subagent row needs for its description before the description shows. */
export const DESCRIPTION_ROOM_MIN = 8;
/** The usage percents of the gradient stops: green at and below the first, amber at the second, and red at and above the third. */
export const GRADIENT_GREEN_PERCENT = 20;
export const GRADIENT_AMBER_PERCENT = 60;
export const GRADIENT_RED_PERCENT = 90;
/** The range of `autoCompactWindow` that Claude Code accepts, in tokens. A value outside it is not used. */
export const COMPACT_WINDOW_MIN = 100_000;
export const COMPACT_WINDOW_MAX = 1_000_000;
