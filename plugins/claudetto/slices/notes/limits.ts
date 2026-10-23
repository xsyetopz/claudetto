// The bounds of the `notes` slice.

/** The count of prompts that a note stays above the prompt (spec `side-notes`, "Note Keys"). */
export const NOTE_PROMPTS = 2;

/** The count of equal denies, asks, or failing checks in a row that sets a note. */
export const REPEAT_MIN = 3;

/** The count of ignored notes in a row from which the back-off starts, as in the built-in mod (binary 2.1.309 `chunk-82wcyxds.js`). */
export const BACKOFF_FROM = 3;

/** The most checks that the back-off skips. */
export const SKIP_MAX = 16;

/** The count of last note lines that a new line is compared with. */
export const RECENT_MAX = 50;

/** The time that a background task runs before a note says so: 30 minutes. The API gives no output time of a task. */
export const BACKGROUND_MS = 30 * 60 * 1000;

/** The most time that a `git` run of the rule "user edit" takes. */
export const GIT_TIMEOUT_MS = 5_000;

/** The most characters of the failing test line that a note keeps. */
export const SIGN_CHARS = 100;
