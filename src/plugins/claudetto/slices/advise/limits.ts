// The bounds of the `advise` slice.

/** The most bytes of context that one call sends: the question, the plan, the failing checks, the recent tool results, and the end of the conversation. */
export const CONTEXT_BYTES = 24_000;

/** The most bytes of the recent tool results in one call. The newest results come first, and the rest of `CONTEXT_BYTES` goes to the end of the conversation. */
export const RESULTS_BYTES = 12_000;

/** The most bytes of one tool result. A longer result is cut at its end, with a marker. */
export const RESULT_BYTES = 3000;

/** The token cap of one piece of advice. */
export const MAX_TOKENS = 2048;

/** The time limit of one call, in milliseconds. */
export const TIMEOUT_MS = 120_000;

/** The most calls in one turn. */
export const MAX_CALLS_PER_TURN = 3;

/** The most calls in one session. */
export const MAX_CALLS_PER_SESSION = 20;
