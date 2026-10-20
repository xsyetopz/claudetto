// The bounds of the `decide` slice, in one place.
// Each attempt of the TypeSafe client has a timeout, and the whole run ends before `JEV_TIMEOUT_MS`.
// `ATTEMPT_TIMEOUT_MS * TRIES` plus the waits of `BACKOFF_MS` fit in `JEV_TIMEOUT_MS`, and a test pins that.

/** The most time that the hook waits for one run of the TypeSafe client, in milliseconds. */
export const JEV_TIMEOUT_MS = 45_000;

/** The number of tries of the TypeSafe client on a 429 or a 529 reply. */
export const TRIES = 3;

/** The first wait before a retry, in milliseconds. Each later wait doubles. */
export const BACKOFF_MS = 1_000;

/** The timeout of one try of the TypeSafe client, in milliseconds. */
export const ATTEMPT_TIMEOUT_MS = 12_000;

/** The most characters of an error body of the TypeSafe API that the client keeps. */
export const ERROR_BODY_MAX = 200;

/** The fewest options of a `pick` question. */
export const MIN_OPTIONS = 2;

/** The most options of a `pick` question. */
export const MAX_OPTIONS = 255;

/** The confidence under which a Jev answer says that Jev is not sure. */
export const MIN_CONFIDENCE = 0.5;

/**
 * The margin that a pick needs over chance, `1 / options`.
 * The confidence is the probability of the top option, so with 2 options it is never under 0.5.
 * A margin of 0.15 makes a 2-option pick need 0.65, which a guess near 0.5 or 0.6 does not reach.
 */
export const MIN_MARGIN = 0.15;

/** The distance from 0.5 under which a yes or no answer says that Jev is not sure. */
export const YES_NO_UNSURE_BAND = 0.2;
