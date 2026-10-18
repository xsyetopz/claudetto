// The bounds of the `goal` slice.

/** The count of turns in a row with the same failing checks and the same output after which the goal stops. */
export const STALL_DEFAULT = 3;

/** The most characters of the output of a check that the state keeps and the next turn shows. The tail has the error. */
export const OUTPUT_TAIL_CHARS = 1500;

/** The most time that a `run` check may take, in milliseconds. */
export const RUN_TIMEOUT_MS = 300_000;
