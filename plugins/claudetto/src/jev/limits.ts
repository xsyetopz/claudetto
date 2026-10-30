// The bounds of the decision tool.

/** The fewest options of a question that Jev can pick from. */
export const MIN_OPTIONS = 2;

/** The most P(yes) of the approval question under which a question is no approval: a wrong "no" would let Jev approve for the user. */
export const APPROVAL_MAX = 0.2;

/** The number of tries of a TypeSafe call on a 429 or a 529 reply, the first one included. */
export const TRIES = 3;

/** The first wait before a retry of a TypeSafe call, in milliseconds. Each later wait doubles. */
export const BACKOFF_MS = 1000;

/** The time of one try of a TypeSafe call, in milliseconds. `HttpInit` has no timeout, so the call is raced with `$.clock`. */
export const ATTEMPT_TIMEOUT_MS = 12_000;

/** The most characters of a TypeSafe error body that an error keeps. */
export const ERROR_BODY_MAX = 200;

/** The confidence of a `choice` answer under which Jev is not sure: the floor of `confidence.md` ("The 0.5 confidence floor catches anything the model reports as genuinely uncertain"). */
export const MIN_CONFIDENCE = 0.5;
