// The bounds of the `reply` slice.

/** Jev blocks the stop when P(yes) that the reply opens with filler is this high or more. */
export const OPENING_YES_MIN = 0.8;

/** Jev lets the stop go with no model call when P(yes) is this low or less. Between the two limits, the model decides. */
export const OPENING_NO_MAX = 0.2;

/** The sentences of the reply that the judge reads. */
export const OPENING_SENTENCES = 3;

/** The most characters of the opening that the judge reads. */
export const OPENING_CHARS = 600;

/** The most characters of the last request of the user that the judge reads. */
export const REQUEST_CHARS = 600;

/** The model that judges the opening, when Jev is not sure. */
export const OPENING_MODEL = "claude-haiku-5-5";

/** The most tokens of the answer of the model. */
export const OPENING_MAX_TOKENS = 512;

/** The most time that the model may take, in milliseconds. */
export const OPENING_TIMEOUT_MS = 20_000;
