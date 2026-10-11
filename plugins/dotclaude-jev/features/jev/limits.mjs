// The bounds of the Jev feature.
// Each number of the feature is here, and the other files import it.

/** The client script, relative to the plugin root. */
export const CLIENT = "features/jev/cli.mjs";

/**
 * How long the client may run before the hooks module kills it.
 * The retries of the client must end before it, so the bounds below derive from it.
 */
export const JEV_TIMEOUT_MS = 45000;

/** How many times the client sends a request (the first send and the retries). */
export const TRIES = 3;

/** The wait before the first retry. Each next wait is double the one before. */
export const BACKOFF_MS = 1000;

/** The time that is left free under the kill bound, for the start of Node.js and the output. */
export const MARGIN_MS = 2000;

/**
 * The wait before the retry that follows try `i` (counted from 0).
 * @param {number} i
 */
export const waitMs = (i) => BACKOFF_MS * 2 ** i;

/** The waits of all retries: there is one fewer wait than there are tries. */
export const TOTAL_WAIT_MS = Array.from({ length: TRIES - 1 }, (_, i) =>
  waitMs(i),
).reduce((sum, ms) => sum + ms, 0);

/** The timeout of one request: all tries and waits fit under the kill bound with the margin. */
export const ATTEMPT_TIMEOUT_MS = Math.floor(
  (JEV_TIMEOUT_MS - MARGIN_MS - TOTAL_WAIT_MS) / TRIES,
);

/** Under this confidence, the TypeSafe docs treat an answer as uncertain. This is the one confidence bound of the code. */
export const MIN_CONFIDENCE = 0.5;

/** The most characters of the body of an error reply that go to Claude. */
export const ERROR_BODY_MAX = 200;

/** A yes or no answer within this distance of 0.5 is not sure. */
export const YES_NO_UNSURE_BAND = 0.2;

/** The count of options of a `pick` question. */
export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 255;

/** The count of levels of a `rate` question. */
export const MIN_LEVELS = 2;
export const MAX_LEVELS = 10;
