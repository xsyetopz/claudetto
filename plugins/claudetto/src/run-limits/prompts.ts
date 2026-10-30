// The texts of the run limits. Each refusal names the count and the setting to change.

/** The refusal that `crowded` gives when the running subagents reach `subagentCap`; it names the option to raise. */
export const DENY_SUBAGENTS = (v: { running: number; cap: number }): string =>
	`${v.running} subagents run now and the cap is ${v.cap}. Wait for one to finish before you start another. The user can raise the cap with the option \`subagentCap\` of claudetto.`;

/** The refusal that `spawn.ts` gives when the starts in the last period reach `startCap`; it names `startCap` and `windowSeconds`. */
export const DENY_STARTS = (v: {
	starts: number;
	cap: number;
	seconds: number;
}): string =>
	`${v.starts} subagents started in the last ${v.seconds} seconds and the cap is ${v.cap}. Do the work yourself or wait. The user can raise the cap with the option \`startCap\` of claudetto, and the period with \`windowSeconds\`.`;

/** The refusal that `calls.ts` gives at heavy context when the calls in the last period reach `callCap`; it names `callCap` and `heavyTokens`. */
export const DENY_CALLS = (v: {
	calls: number;
	cap: number;
	seconds: number;
}): string =>
	`The context is heavy and ${v.calls} tool calls ran in the last ${v.seconds} seconds, so the cap of ${v.cap} holds this call. Compact or end the session, or ask the user to raise \`callCap\` or \`heavyTokens\` in the options of claudetto.`;

/** The refusal that `failures.ts` gives when the same call has failed `failLimit` times with the same error; it tells the agent to stop and report the error. */
export const DENY_FAILED = (v: {
	count: number;
	error: string;
	limit: number;
}): string =>
	`This same call failed ${v.count} times with the same error: ${v.error} Stop and report this to the user, with the error above. Do not send this call again. The user can change the limit \`failLimit\` (${v.limit}) in the options of claudetto.`;

/** The text that `background.ts` builds at Stop when background tasks are still running, one line for each task. */
export const STOP_TASKS = (v: { lines: readonly string[] }): string =>
	`Background tasks still running at Stop:\n${v.lines.join("\n")}`;
