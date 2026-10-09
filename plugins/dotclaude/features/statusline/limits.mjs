// The bounds of the status line, in one place.
// Tests pin the copies in the profile to these values, so change a bound here and nowhere else.

/** The seconds between two runs of the status line. The countdowns and the blinking glyph use it. */
export const REFRESH_SECONDS = 1;

/** The time that a slow read (`git`, the usage cache) stays valid in the temporary folder. */
export const STATUS_CACHE_MS = 5_000;

/** The time that the one `git status` call can take. */
export const GIT_TIMEOUT_MS = 1_500;

/** The most rows of the main status line. */
export const MAX_ROWS = 3;

/** The width in columns when `COLUMNS` is not set, and the columns that stay free at the right edge. */
export const DEFAULT_COLUMNS = 120;
export const COLUMNS_MARGIN = 4;

/** The part of a limit window that must pass before the pace and the run-out time show. */
export const PACE_MIN_FRACTION = 0.03;

/** The seconds between two burn-rate samples, the most samples kept, and the span that the rate reads. */
export const SAMPLE_INTERVAL_S = 60;
export const SAMPLES_MAX = 50;
export const BURN_WINDOW_S = 3_600;

/** The seconds before the prompt cache expires at which the cache segment blinks a warning glyph. */
export const CACHE_ALARM_S = 120;

/** The age after which the usage cache of Claude Code is not trusted. */
export const CREDITS_MAX_AGE_MS = 3_600_000;

/** The age after which the Fable weekly window of the usage cache is hidden. Claude Code rejects a copy older than this. */
export const FABLE_MAX_AGE_MS = 3_600_000;

/** The most bytes read from the start of the transcript for the context breakdown. */
export const TRANSCRIPT_BYTES_MAX = 4_000_000;

/**
 * The characters for each token in the estimates of the memory, skills, and agents.
 * They are the divisors of the local estimate of `/context` in the 2.1.295 bundle (`Eh`):
 * `CHARS_PER_TOKEN_LEGACY` for a model in `LEGACY_TOKENIZER_MODELS`, else `CHARS_PER_TOKEN`.
 */
export const CHARS_PER_TOKEN = 3;
export const CHARS_PER_TOKEN_LEGACY = 4;
export const LEGACY_TOKENIZER_MODELS = [
  "claude-3-opus",
  "claude-3-sonnet",
  "claude-3-haiku",
  "claude-3-5-sonnet",
  "claude-3-5-haiku",
  "claude-3-7-sonnet",
  "claude-opus-4-0",
  "claude-opus-4-1",
  "claude-opus-4-5",
  "claude-opus-4-6",
  "claude-sonnet-4-0",
  "claude-sonnet-4-5",
  "claude-sonnet-4-6",
  "claude-haiku-4-5",
];

/**
 * The tokens below the window that Claude Code keeps free for itself.
 * A feature imports no other feature, so a test pins this copy to `CONTEXT_BLOCK_MARGIN` in `features/context/limits.mjs`.
 */
export const CONTEXT_BLOCK_MARGIN = 23_000;

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
 * A feature imports no other feature, so a test pins these lists to the capability of each model in `features/router/limits.mjs`.
 * `claude-haiku-4-5` is out of the roster, so it has no entry.
 */
export const SUBAGENT_EFFORTS = {
  "opus-5-5": ["low", "medium", "high", "xhigh", "max"],
  "sonnet-5-5": ["low", "medium", "high", "xhigh", "max"],
  "haiku-5-5": ["low", "medium", "high", "xhigh", "max"],
};

/**
 * The most bytes that one run reads from the end of the transcript for the newest `/context` table.
 * A `/context` record is a few kilobytes, so a run reads only the lines after the kept offset, up to this bound.
 */
export const TABLE_TAIL_BYTES_MAX = 1_000_000;
