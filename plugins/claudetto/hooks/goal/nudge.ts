import type { On } from "claude-code";

import { fault } from "../shared/fault";
import { fieldOf } from "../shared/field";
import type { Tracker } from "./state";

/** A goal condition that asks for delegated work: delegate, subagent, worker. */
const DELEGATES = /\b(?:delegat\w*|sub-?agents?|workers?)\b/iu;

/** Files that hold prose, whose edits a lead may make itself. */
const DOC_FILE = /\.(?:md|mdx|markdown|txt|rst|adoc)$/iu;

/** The note the lead reads beside the result of its first source edit, within 200 characters. */
export const NUDGE_NOTE =
	"claudetto: the active goal says to delegate, and you edited source yourself. Hand each slice to a worker with the Agent tool.";

/** Whether a goal condition asks for delegated work. */
export const namesDelegation = (condition: string): boolean =>
	DELEGATES.test(condition);

/** Whether a path is a source file, not a prose document. */
export const isSource = (path: string): boolean => !DOC_FILE.test(path);

/**
 * Nudges the main loop toward the Agent tool when it edits source itself under a goal that names
 * delegation (REQ-GOAL-030). The note rides on the edit's result once per session and never
 * denies. A subagent edit (`agentId` set) is the delegation the goal asks for, so it passes.
 * ENGINE(v2.1.330): no module event carries the active goal (the engine keeps it in
 * `activeGoal` and offers a plugin no read), so the tracker's copy, taken from each `/goal`
 * run the plugin sees, stands in. A goal set before the plugin loaded, as on a resumed
 * session, is unseen. The command hook input's `transcript_path` would allow a read of the
 * goal, but a module event carries no such field, so the transcript is not parsed here.
 */
export function registerNudge(on: On, tracker: Tracker): void {
	on(
		"tool.call",
		{ tool: /^(?:Edit|Write|NotebookEdit)$/u },
		async (_$, e, next) => {
			const r = await next(e);
			if (
				tracker.nudged === true ||
				e.agentId !== undefined ||
				r.deny !== undefined ||
				r.isError === true ||
				tracker.goal === undefined ||
				!namesDelegation(tracker.goal.condition)
			) {
				return r;
			}
			const path = fieldOf(
				e,
				e.tool === "NotebookEdit" ? "notebook_path" : "file_path"
			);
			if (typeof path === "string" && !isSource(path)) {
				return r;
			}
			tracker.nudged = true;
			return { ...r, context: [...(r.context ?? []), NUDGE_NOTE] };
		}
	).catch(($, e, next) => {
		fault($, "goal delegation nudge", next.error);
		return next(e);
	});
}
