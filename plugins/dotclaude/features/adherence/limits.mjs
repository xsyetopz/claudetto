// The bounds of the `adherence` hooks (design D34), in one place.
// Tests pin the `timeout` in `hooks/hooks.json` to `HOOK_TIMEOUT_S` once the hook entries exist.

/** The `timeout` in seconds of each `adherence` command hook in `hooks/hooks.json`. */
export const HOOK_TIMEOUT_S = 10;

/** The largest file in bytes that a check reads to compare the text before and after a call. A larger file counts as unread. */
export const FILE_MAX_BYTES = 1_000_000;

/** The most characters of text that a check scans for code items or banned patterns. A longer text passes unchecked. */
export const SCAN_MAX_CHARS = 200_000;

/** The most bytes of a session transcript that the approval check reads, from the end of the file. */
export const TRANSCRIPT_MAX_BYTES = 4_000_000;

/** The most code items that a deny reason lists. The reason gives the count of the rest. */
export const ITEMS_SHOWN_MAX = 8;

/** The largest rules file in bytes. A larger file counts as absent. */
export const RULES_FILE_MAX_BYTES = 64_000;

/** The most entries of each kind (`maxLines`, `banned`, `ask`) that the loader keeps. */
export const RULES_ENTRIES_MAX = 200;

/** The most characters of a `pattern` of a rules file. A longer pattern is dropped. */
export const PATTERN_MAX_CHARS = 200;

/** The most characters of a changed line that an ask reason shows. A longer line is cut. */
export const LINE_SHOWN_MAX_CHARS = 80;
