// The parts of Claude Code that the verdicts (`dev/builtins/verdicts/`) turn `off` with a hook.
// A setting or the engine covers each other `off` row, and `tests/claudetto/session/prompt/off.test.ts` pins that cover.

/** The attachment kinds that `prompt.attachment` leaves out of the request. */
export const OFF_ATTACHMENTS = ["goal_status", "tool_hosts_notice"] as const;
