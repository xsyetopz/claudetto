// The bounds of the `checks` slice, in one place.

/** The most output lines that the summary of one failed command prints: the last ones. The log file holds the rest. */
export const MAX_FAILURE_LINES = 40;

/** The most characters of one printed line. A longer line is cut and ends in `...`. */
export const MAX_LINE_CHARS = 200;

/** The most output lines that the summary prints for a passing command. A longer output stays in the log file. */
export const MAX_PASS_OUTPUT_LINES = 10;

/** The time that one command may run, in milliseconds. A command over it is killed and counts as failed. */
export const COMMAND_TIMEOUT_MS = 1_800_000;

/** The count of characters of the random part of a log file name, which keeps two runs in one second apart. */
export const RUN_ID_LENGTH = 8;
