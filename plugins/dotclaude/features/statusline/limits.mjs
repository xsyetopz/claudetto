// The bounds of the status line, in one place.
// Tests read these values, and a test pins the `effort` of each agent file to them, so change a bound here and nowhere else.

/** The seconds between two runs of the status line. The countdowns and the blinking glyph use it. */
export const REFRESH_SECONDS = 1;

/** The time that the one `git status` call can take. */
export const GIT_TIMEOUT_MS = 1_500;

/** The most rows of the main status line. */
export const MAX_ROWS = 3;

/** The width in columns when `COLUMNS` is not set, and the columns that stay free at the right edge. */
export const DEFAULT_COLUMNS = 120;
export const COLUMNS_MARGIN = 4;

/** The part of a limit window that must pass before the pace and the run-out time show. */
export const PACE_MIN_FRACTION = 0.03;

/** The seconds before the prompt cache expires at which the cache segment blinks a warning glyph. */
export const CACHE_ALARM_S = 120;

/** The age after which the usage cache of Claude Code is not trusted. */
export const CREDITS_MAX_AGE_MS = 3_600_000;

/** The age after which the Fable weekly window of the usage cache is hidden. Claude Code rejects a copy older than this. */
export const FABLE_MAX_AGE_MS = 3_600_000;

/** The text between two columns of the grid. */
export const GRID_GAP = "   ";

/** The session time before the cost and line rates show. A shorter time gives a rate with no meaning. */
export const RATE_MIN_MS = 60_000;

/** The characters of the session name in the line. */
export const SESSION_NAME_MAX = 32;

/** The most subagent rows. Claude Code shows the rows in the panel, so a long list is no help. */
export const SUBAGENT_ROWS_MAX = 20;

/**
 * The effort levels that a subagent can set, for each model. A model with none takes no `effort`.
 * The status line marks an effort that is not in the list.
 * A test pins the `effort` of each agent file to these lists.
 * `claude-haiku-4-5` is out of the roster, so it has no entry.
 */
export const SUBAGENT_EFFORTS = {
  "opus-5-5": ["low", "medium", "high", "xhigh", "max"],
  "sonnet-5-5": ["low", "medium", "high", "xhigh", "max"],
  "haiku-5-5": ["low", "medium", "high", "xhigh", "max"],
};

/**
 * The most bytes that one run reads from the end of the transcript for the newest `/context` table.
 * A `/context` record is a few kilobytes, and a run keeps no offset, so it reads this tail again at each call.
 */
export const TABLE_TAIL_BYTES_MAX = 1_000_000;
