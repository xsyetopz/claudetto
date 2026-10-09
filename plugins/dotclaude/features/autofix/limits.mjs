// The bounds of the auto-fix hook, in one place.
// Tests pin the timeout in `hooks/hooks.json` to `HOOK_TIMEOUT_S`.

/** The most lines in the block that the hook gives to Claude, with the header line. */
export const REPORT_LINES_MAX = 20;

/** The time in milliseconds for one tool run. A tool that passes it is stopped. */
export const TOOL_TIMEOUT_MS = 20_000;

/** The time in milliseconds for all tool runs of one stop. */
export const TOTAL_TIMEOUT_MS = 45_000;

/** The `timeout` in seconds of the `Stop` hook in `hooks/hooks.json`. It is above `TOTAL_TIMEOUT_MS`. */
export const HOOK_TIMEOUT_S = 60;
