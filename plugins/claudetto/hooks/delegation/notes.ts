import type { On } from "claude-code";

import { fault } from "../shared/fault";
import { runawayDue } from "./runaway";
import { thrashNote } from "./thrash";

/**
 * Adds the notes a subagent should read to its tool results: one hook serves
 * every note source because the engine refuses a second `tool.call` hook
 * without a matcher in the plugin (the memory hold has that one); the
 * `agentId` matcher keeps the main loop out. A source marks its note shown
 * when it answers, so each note reaches the model once.
 * ENGINE(v2.1.330): an unmatched `tool.call` hook may be registered once per plugin, and
 * the loader follows `$` only into functions of the module's own files, so the
 * sources are imported here, not passed in.
 */
export function registerAgentNotes(on: On): void {
	on("tool.call", { agentId: /./u }, async ($, e, next) => {
		const r = await next(e);
		if (e.agentId === undefined || r.deny !== undefined) {
			return r;
		}
		const notes = [
			thrashNote(e.agentId),
			await runawayDue($, e.agentId)
		].filter((note): note is string => note !== undefined);
		return notes.length === 0
			? r
			: { ...r, context: [...(r.context ?? []), ...notes] };
	}).catch(($, e, next) => {
		fault($, "subagent notes", next.error);
		return next(e);
	});
}
