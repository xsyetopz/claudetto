import type { On } from "claude-code";

import { fault } from "../shared/fault";
import { fieldOf } from "../shared/field";
import type { Tracker } from "./state";

/** A word that asks for delegated work: delegate, subagent, worker. */
const DELEGATES = /\b(?:delegat\w*|sub-?agents?|workers?)\b/giu;

/** A word that turns the delegation word after it into a refusal: "don't delegate", "no subagents". */
const NEGATION =
	/\b(?:no|not|never|nor|without|avoid\w*|skip\w*|forbid\w*|prohibit\w*|(?:do|does|did|is|are|was|were|can|could|should|would|must|will|have|has|need)n['\u2019]?t|won['\u2019]?t|cannot|(?:instead|rather)\s+(?:of|than)|stop|refrain\w*)\b/iu;

/** A clause ends at punctuation or a contrast word; a negation never reaches across one. */
const CLAUSE_END = /[.;:,!?\n()]|\b(?:but|however|then)\b/giu;

/** A word after the delegation word that refuses it: "delegation is not allowed". */
const REFUSED_AFTER =
	/\b(?:not|never|forbidden|prohibited|banned|disallowed)\b|n['’]t\b/iu;

/** How many words before a delegation word a negation can still reach it. */
const NEGATION_REACH = 5;

/** Whether a negation sits in the same clause, within a few words of the match. */
function isNegated(before: string, after: string): boolean {
	const lead = (before.split(CLAUSE_END).at(-1) ?? "").trim().split(/\s+/u);
	const tail = (after.split(CLAUSE_END)[0] ?? "").trim().split(/\s+/u);
	return (
		NEGATION.test(lead.slice(-NEGATION_REACH).join(" ")) ||
		REFUSED_AFTER.test(tail.slice(0, 3).join(" "))
	);
}

/** Files that hold prose, whose edits a lead may make itself. */
const DOC_FILE = /\.(?:md|mdx|markdown|txt|rst|adoc)$/iu;

/** The note the lead reads beside the result of its first source edit, within 200 characters. */
export const NUDGE_NOTE =
	"claudetto: the active goal says to delegate, and you edited source yourself. Hand each slice to a worker with the Agent tool.";

/**
 * Whether a goal condition asks for delegated work. A delegation word the condition negates
 * ("don't delegate", "no subagents", "without workers") is a refusal, so it does not count;
 * the nudge enforces the user's instruction and never contradicts it.
 */
export const namesDelegation = (condition: string): boolean =>
	[...condition.matchAll(DELEGATES)].some(
		(m) =>
			!isNegated(
				condition.slice(0, m.index),
				condition.slice(m.index + m[0].length)
			)
	);

/** Whether a path is a source file, not a prose document. */
export const isSource = (path: string): boolean => !DOC_FILE.test(path);

/**
 * Nudges the main loop toward the Agent tool when it edits source itself under a goal that names
 * delegation (REQ-GOAL-030). The note rides on the edit's result once per session and never
 * denies. A subagent edit (`agentId` set) is the delegation the goal asks for, so it passes.
 * The goal comes from the tracker, which copies it from each `/goal` run the plugin sees. A goal
 * restored on resume, or set before the plugin loaded, is unseen, so the nudge stays quiet there.
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
