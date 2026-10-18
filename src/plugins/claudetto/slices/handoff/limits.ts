// The bounds of the `handoff` slice.

/** The most lines of a handoff, as its prompt asks for them (spec `handoff`, "Checked handoff file"). */
export const HANDOFF_LINES_MAX = 10;

/** The most characters of the input of one tool call that the fork prompt names (`handoff-cost-301.md`). */
export const CALL_INPUT_CHARS_MAX = 300;

/** The characters of one token in the estimate of the size of the new context (task 3.3). */
export const CHARS_PER_TOKEN = 4;
