// The bounds of the `search` slice.

/** The longest time of one search run, in milliseconds. It is the default of `$.process.run`, and a longer search is too wide for the model to read. */
export const SEARCH_TIMEOUT_MS = 30_000;

/** The longest time of the run that finds out if a program is on the host, in milliseconds. */
export const PROBE_TIMEOUT_MS = 5000;

/** The most entries of `grep` that one call returns when `head_limit` is not set: the default of the built-in `Grep`. */
export const HEAD_LIMIT_DEFAULT = 250;

/** The most files of `glob` that one call returns: the bound of the built-in `Glob`. */
export const GLOB_RESULTS_MAX = 100;

/** The most lines of context around a match. */
export const CONTEXT_MAX = 100;

/** The most characters of the text that a call returns, so that a wide match cannot fill the context. */
export const RESULT_CHARS_MAX = 100_000;
