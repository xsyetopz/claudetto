// The bounds of the `hygiene` slice.

/**
 * The age in minutes after which a `fswatch-probe-*` folder is a leftover.
 * The settings watcher of Claude Code removes its probe folder within 1,500 ms, so a folder of this age is not in use.
 */
export const PROBE_MAX_AGE_MIN = 60;

/** The longest time of the one `find` run that removes the leftover probe folders, in milliseconds. */
export const SWEEP_TIMEOUT_MS = 60_000;

/** The most files in the edit ledger. The oldest entry goes first, so the ledger and its state stay small. */
export const LEDGER_MAX_FILES = 200;

/** The most times that a write of the ledger runs again after another write landed first. */
export const LEDGER_WRITE_TRIES = 5;

/** The age in days over which a session folder is old, when `cleanupPeriodDays` of Claude Code is not set. */
export const DEFAULT_CLEANUP_DAYS = 30;

/** The folder of the worktrees of Claude Code, under the project root. */
export const WORKTREES_DIR = ".claude/worktrees";
