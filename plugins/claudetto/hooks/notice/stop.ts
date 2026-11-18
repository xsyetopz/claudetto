import type { On } from "claude-code";

/**
 * Raises a native notification when a turn stops on an API error. Vanilla
 * 2.1.327 only sends its generic idle notice after the idle threshold
 * (chunk-cfxefa64.js@56794), so an error stop reads like a finished turn.
 * The user's `preferredNotifChannel` decides the channel; `notifications_disabled`
 * turns this off too.
 */
export function registerStopNotice(on: On): void {
	on("classic.StopFailure", async ($, e, next) => {
		const result = await next(e);
		const detail = e.error_details ? `: ${e.error_details}` : "";
		await $.ui.notify(`The turn stopped on an API error (${e.error})${detail}. Reply to retry.`, { title: "claudetto" });
		return result;
	}).catch((_$, e, next) => next(e)); // A failed notification must not change the stop.
}
