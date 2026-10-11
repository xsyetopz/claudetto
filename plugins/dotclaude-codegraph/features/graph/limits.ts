// The bounds of the code-graph feature.

/** How long `codegraph --version` may run for the check. */
export const QUERY_TIMEOUT_MS = 2000;

/** How long the sync at session start may run. The hook timeout in `hooks.json` is longer. */
export const START_SYNC_TIMEOUT_MS = 8000;

/** How long the background sync after an edit may run. */
export const BACKGROUND_SYNC_TIMEOUT_MS = 60000;
