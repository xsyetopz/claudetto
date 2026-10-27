// The bounds of the `hygiene` slice.
/** The age in minutes after which a `fswatch-probe-*` folder is a leftover. Claude Code removes its probe folder within 1,500 ms. */
export const PROBE_MAX_AGE_MIN = 60;
/** The longest time of the one `find` run that removes the leftover probe folders, in milliseconds. */
export const SWEEP_TIMEOUT_MS = 60_000;
/** The most lines in the edit ledger file. The oldest line goes first. */
export const LEDGER_MAX_FILES = 200;
/** The longest look-back in milliseconds of the capture of the changes of a `Bash` call, also when the call reports no run time. */
export const BASH_CHANGE_MAX_MS = 600_000;
/** The margin in milliseconds before the start of a `Bash` call, for the grain of the modification times of files. */
export const BASH_CHANGE_SLACK_MS = 2000;
/** The most changed files of `git status` that the capture of a `Bash` call and the context of `git status` and `git diff` read. */
export const WHO_FILES_MAX = 50;
/** The longest time of one `git` run of the capture, in milliseconds. */
export const GIT_TIMEOUT_MS = 10_000;
/** The most times that a write of the ledger runs again after another write landed first. */
export const LEDGER_WRITE_TRIES = 5;
/** The age in days over which a session folder is old, when `cleanupPeriodDays` of Claude Code is not set. */
export const DEFAULT_CLEANUP_DAYS = 30;
/** The most characters of a Markdown file whose headings get the Title Case. A longer file stays as it is. */
export const HEADINGS_FILE_MAX = 1_000_000;
/** The folder of the worktrees of Claude Code, under the project root. */
export const WORKTREES_DIR = ".claude/worktrees";
