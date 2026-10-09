// The bounds of the code-graph feature.

/** The most characters of graph context that one `Grep` or `Glob` call gets. */
export const GRAPH_CONTEXT_MAX = 1200;

/** How long `codegraph query` or `codegraph callers` may run before the hook adds nothing. */
export const QUERY_TIMEOUT_MS = 2000;

/** How long the sync at session start may run. The hook timeout in `hooks.json` is longer. */
export const START_SYNC_TIMEOUT_MS = 8000;

/** How long the background sync after an edit may run. */
export const BACKGROUND_SYNC_TIMEOUT_MS = 60000;

/** The `--limit` of `codegraph callers`, so the output stays small. */
export const CALLERS_LIMIT = 10;

/** A searched name with fewer characters gives too many graph hits, so the hook skips it. */
export const SYMBOL_MIN_CHARS = 3;
