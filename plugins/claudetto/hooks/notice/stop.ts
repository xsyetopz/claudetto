import type { EngineInterface, On } from "claude-code";
import { fault } from "../shared/fault";

/**
 * The tail core gives every API-error text for a stream cut after output
 * (connection lost, server error, stalled stream, sleep), and only those
 * (chunk-m14bt1pz.js@3366150, 2.1.327).
 */
export const CUT_TAIL = "The response above may be incomplete.";

/** The continuation the model reads after a cut; the plugin frame tells it the plugin sent it. */
export const RESUME_TEXT =
	"Your response above was cut off mid-stream by a dropped connection. Resume from the exact point where it stops, " +
	"so the user reads one continuous answer. If none of it survived, answer the request from the start.";

/** Resumes per window: a second cut gets a second try, a third means the link is down and the person decides. */
const MAX_RESUMES = 2;
const WINDOW_MS = 10 * 60_000;

/** Raises the native error-stop notice. */
async function notify($: EngineInterface, error: string, details?: string): Promise<void> {
	await $.ui.notify(`The turn stopped on an API error (${error})${details ? `: ${details}` : ""}. Reply to retry.`, { title: "claudetto" });
}

/**
 * Handles a turn that stops on an API error. Core 2.1.327 resumes a response
 * cut mid-stream only for subagents and `-p` (`H_`, chunk-8g2nr9dn.js@203426);
 * a session with a person at it stops and waits for a typed "continue". Such a
 * cut is marked at `classic.StopFailure`, and the turn's `turn.complete` submits
 * one continuation, at most MAX_RESUMES per WINDOW_MS, because the host refuses
 * a submit from a StopFailure hook. Every other error stop, and a cut past the
 * cap, raises a native notification, because vanilla sends only its generic
 * idle notice after the idle threshold (chunk-cfxefa64.js@56794). The user's
 * `preferredNotifChannel` decides the channel.
 */
export function registerStopNotice(on: On): void {
	const resumed: number[] = [];
	let cut = false;
	on("classic.StopFailure", async ($, e, next) => {
		// Marked before next(e) so the turn.complete that follows sees it.
		const now = Date.now();
		while (resumed.length > 0 && now - (resumed[0] ?? 0) > WINDOW_MS) resumed.shift();
		cut = e.last_assistant_message?.trim().endsWith(CUT_TAIL) === true && resumed.length < MAX_RESUMES;
		const result = await next(e);
		if (!cut) await notify($, e.error, e.error_details);
		return result;
	}).catch(($, e, next) => (fault($, "stop notice", next.error), next(e))); // A failed notice must not change the stop.
	on("turn.complete", { reason: "error" }, async ($, e, next) => {
		const result = await next(e);
		if (!cut || e.agentId !== undefined) return result;
		cut = false;
		if ((await $.session.surfaces()).length === 0) {
			// A -p run has core's own recovery; a cut that reaches here exhausted it.
			await notify($, "server_error", "the response was cut mid-stream");
			return result;
		}
		resumed.push(Date.now());
		// The prompt enters once the session is idle, after this hook returns, so it is not awaited.
		void $.prompt.submit({ text: RESUME_TEXT }).catch((err: unknown) => fault($, "cut resume", err));
		return result;
	}).catch(($, e, next) => (fault($, "cut resume", next.error), next(e)));
}
