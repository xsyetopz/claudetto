export const MIN_OPTIONS = 2;

/** A wrong "no" on the approval question would let Jev approve for the user. */
export const APPROVAL_MAX = 0.2;

export const TRIES = 3;

export const BACKOFF_MS = 1000;

/** `HttpInit` has no timeout, so the call is raced with `$.clock`. */
export const ATTEMPT_TIMEOUT_MS = 12_000;

export const ERROR_BODY_MAX = 200;

export const MIN_CONFIDENCE = 0.5;
