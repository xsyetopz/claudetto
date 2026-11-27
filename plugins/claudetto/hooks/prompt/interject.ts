import type { On } from "claude-code";

import { fault } from "../shared/fault";

/** Matches every turn id, prompt text and tool name, so each hook here holds a matcher. */
const ANY = /(?:)/u;

/** The refusal the main loop's next call gets after the user typed into its turn. */
export const INTERJECT_NOTE =
	"The user sent a message during this turn. Reply to it first, then make the calls it still calls for.";

/**
 * Holds the main loop's next tool call once after the user types into a running turn (Enter, not
 * `ctrl+x enter`), so the model reads the message and answers it before it acts again. The engine
 * delivers such a message beside the next tool result, and a model that kept calling tools went on
 * with the old plan for several calls (ISSUES-2026-11-09 items 3 and 9).
 */
export function registerInterject(on: On): void {
	let turn: string | undefined;
	let pending = false;
	on("turn.start", { turnId: ANY }, (_$, e, next) => {
		if (e.agentId === undefined) {
			turn = e.turnId;
			pending = false;
		}
		return next(e);
	}).catch(($, e, next) => {
		fault($, "interject turn", next.error);
		return next(e);
	});
	on("prompt.submit", { text: ANY }, (_$, e, next) => {
		if (
			e.turnId !== undefined &&
			e.turnId === turn &&
			!e.wait &&
			e.origin.kind === "composer"
		) {
			pending = true;
		}
		return next(e);
	}).catch(($, e, next) => {
		fault($, "interject prompt", next.error);
		return next(e);
	});
	on("tool.call", { tool: ANY }, (_$, e, next) => {
		if (e.agentId === undefined && pending) {
			pending = false;
			return { deny: INTERJECT_NOTE };
		}
		return next(e);
	}).catch(($, e, next) => {
		fault($, "interject call", next.error);
		return next(e);
	});
}
