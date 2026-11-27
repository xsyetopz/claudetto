import type { On } from "claude-code";

import { fault } from "../../shared/fault";

/** The use, in percent, from which the model is told to checkpoint (KERNEL-034): 15 points of a window leave room for a commit. */
export const THRESHOLD = 85;

/** The windows the status line shows, by the name the model reads. */
const WINDOWS: Readonly<Record<string, string>> = {
	five_hour: "5-hour",
	seven_day: "7-day"
};

/** The line the model reads when a window crosses the threshold. */
export const lineFor = (name: string, percent: number): string =>
	`Usage limit: the ${name} window is ${Math.round(percent)}% used. ` +
	"Checkpoint now: commit finished work before the limit stops the session. The session handover carries what is left, so write no handover file.";

/** Matches every prompt text, so this hook and the others on `prompt.submit` each hold a matcher. */
const ANY = /(?:)/u;

/**
 * Tells the model once per crossing when the 5-hour or 7-day use passes
 * `THRESHOLD` (KERNEL-034). The status line shows these readings to the person
 * only (ADR-0201); this line reaches the model in the context of the next
 * prompt. A window that falls below the threshold (its reset) is armed again.
 */
export function registerLimitNote(on: On): void {
	const told = new Set<string>();
	on("prompt.submit", { text: ANY }, async ($, e, next) => {
		const lines: string[] = [];
		try {
			const { rateLimits } = await $.session.usage();
			for (const limit of rateLimits) {
				const name = WINDOWS[limit.kind];
				if (name === undefined) {
					continue;
				}
				if (limit.percentUsed < THRESHOLD) {
					told.delete(limit.kind);
				} else if (!told.has(limit.kind)) {
					told.add(limit.kind);
					lines.push(lineFor(name, limit.percentUsed));
				}
			}
		} catch (error) {
			fault($, "usage limit note", error);
		}
		return next(
			lines.length === 0
				? e
				: { ...e, context: [...(e.context ?? []), ...lines] }
		);
	}).catch(($, e, next) => {
		fault($, "usage limit note", next.error);
		return next(e);
	});
}
