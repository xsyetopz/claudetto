// The bounds of the `finish` slice.

/** The most characters of the output of a check that the state keeps and the next turn shows. The tail has the error. */
export const OUTPUT_TAIL_CHARS = 1500;

/** The most time that a `run` check may take, in milliseconds. */
export const RUN_TIMEOUT_MS = 300_000;

/** The most re-blocks of a stop in a row (X21). Then the stop goes on, with a line to the user. */
export const GOAL_BLOCKS_MAX = 5;

/** The most characters of the next open task in the text of a loop block. */
export const LOOP_TASK_CHARS = 120;
