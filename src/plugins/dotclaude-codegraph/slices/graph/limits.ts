// The bounds of the `graph` slice.

/** How long `codegraph --version` may run for the check. */
export const QUERY_TIMEOUT_MS = 2000;

/** The hook timeout of `SessionStart`, in seconds, as `slice.ts` gives it to Claude Code. */
export const SESSION_START_HOOK_TIMEOUT_S = 10;

/**
 * How long the sync at session start may run.
 * On Windows the sync also gets `TREE_GRACE_MS` more, so the total is 9 s, which is 1 s under the hook timeout.
 */
export const START_SYNC_TIMEOUT_MS = 6000;

/** The time that `run-tree.ts` gets to start and to end the process tree after the limit on Windows. */
export const TREE_GRACE_MS = 3000;

/** How long the background sync after an edit may run. The hook timeout in `slice.ts` is longer. */
export const BACKGROUND_SYNC_TIMEOUT_MS = 60000;

/** How long the sync after a `git` command may run. The `git` result waits for it, so it is shorter. */
export const GIT_SYNC_TIMEOUT_MS = 15000;
