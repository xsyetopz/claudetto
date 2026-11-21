import type { On } from "claude-code";

import { fault } from "../shared/fault";
import { fieldOf } from "../shared/field";
import { capNote, capOf, endGoal, isNearCap, type Tracker } from "./state";

/** The head of the row the engine appends each time the goal's Stop hook blocks (probed on 2.1.330). */
const FEEDBACK = "Stop hook feedback:\n[";

/** The notice the engine appends after every Stop hook run (probed on 2.1.330). */
const SUMMARY = "stop_hook_summary";

/** Tracks the turn: a prompt resets the block count, a response awaits the Stop hook, a summary with no block means met. */
function registerTurn(on: On, tracker: Tracker): void {
	// A prompt starts a new run of blocks.
	on("session.append", { door: "prompt" }, (_$, e, next) => {
		if (tracker.goal !== undefined) {
			tracker.goal.blocks = 0;
		}
		return next(e);
	}).catch(($, e, next) => {
		fault($, "goal prompt row", next.error);
		return next(e);
	});
	// The model's response is what the Stop hook judges next.
	on("session.append", { door: "response" }, (_$, e, next) => {
		tracker.stopping = tracker.goal !== undefined;
		return next(e);
	}).catch(($, e, next) => {
		fault($, "goal response row", next.error);
		return next(e);
	});
	// A Stop hook run that blocked appended its feedback row before this summary;
	// one that did not judged the condition met, and the engine dropped the goal.
	on("session.append", { door: "notice" }, (_$, e, next) => {
		if (e.message.name === SUMMARY && tracker.stopping === true) {
			endGoal(tracker, false);
			tracker.stopping = false;
		}
		return next(e);
	}).catch(($, e, next) => {
		fault($, "goal notice row", next.error);
		return next(e);
	});
}

/**
 * Counts the goal's Stop-hook blocks per turn and, near the cap, adds a note
 * to the block's feedback row telling the model to finish, clear with
 * evidence or pause. It also notices when the evaluator judged the goal met.
 * The rows are the only signal a plugin gets: `classic.Stop` is taken by the
 * stop notice, and the engine's cap override is not a hook, so claudetto warns
 * and never lifts it (ENGINE(v2.1.330): no hook sees or moves the cap).
 */
export function registerFeedback(on: On, tracker: Tracker): void {
	registerTurn(on, tracker);
	on("session.append", { door: "note" }, async ($, e, next) => {
		const goal = tracker.goal;
		const text = fieldOf(e.message.content[0], "text");
		if (
			goal === undefined ||
			typeof text !== "string" ||
			!text.startsWith(`${FEEDBACK}${goal.condition}]`)
		) {
			return next(e);
		}
		tracker.stopping = false;
		goal.blocks += 1;
		const cap = capOf(await $.env.get("CLAUDE_CODE_STOP_HOOK_BLOCK_CAP"));
		if (!isNearCap(goal.blocks, cap)) {
			return next(e);
		}
		return next({
			...e,
			message: {
				...e.message,
				content: [
					...e.message.content,
					{ type: "text", text: capNote(goal.blocks, cap) }
				]
			}
		});
	}).catch(($, e, next) => {
		fault($, "goal feedback", next.error);
		return next(e);
	});
}
