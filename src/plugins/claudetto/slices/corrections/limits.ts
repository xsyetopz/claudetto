// The bounds of the `corrections` slice, in one place.

/** The most items of the corrections file that one prompt gets, from the end of the file. */
export const CORRECTIONS_MAX = 5;

/** The most characters of one item. */
export const CORRECTION_CHARS_MAX = 300;

/** The tokens of the context at the bounds, for `evals/hooks.json`: 5 items of 300 characters and the header, at about 4 characters for each token. */
export const CORRECTIONS_TOKENS = 420;
