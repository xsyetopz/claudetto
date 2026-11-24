import type { On } from "claude-code";

import { fault } from "../shared/fault";
import { fieldOf } from "../shared/field";
import {
	capNote,
	capOf,
	endGoal,
	type Goal,
	isNearCap,
	TOOLS_NOTE,
	type Tracker
} from "./state";

/** The head of the row the engine appends each time the goal's Stop hook blocks (probed on 2.1.330). */
const FEEDBACK = "Stop hook feedback:\n[";

/** The notice the engine appends after every Stop hook run (probed on 2.1.330). */
const SUMMARY = "stop_hook_summary";

/** Tracks the turn: a prompt resets the block count, a response awaits the Stop hook, a summary with no block means met. */
function registerTurn(on: On, tracker: Tracker): void {
	on("turn.start", (_$, e, next) => {
		if (e.agentId === undefined) {
			tracker.turnId = e.turnId;
		}
		return next(e);
	}).catch(($, e, next) => {
		fault($, "goal turn start", next.error);
		return next(e);
	});
	// A prompt starts a new run of blocks.
	on("session.append", { door: "prompt" }, (_$, e, next) => {
		if (tracker.goal !== undefined) {
			tracker.goal.blocks = 0;
		}
		delete tracker.ended;
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
 * The notes a block row carries: the tools note on the goal's first block,
 * because under `-p` the set-time copy never reaches the model (RISK-531),
 * and the cap note near the cap.
 */
function blockNotes(goal: Goal, cap: number): string[] {
	const notes = [
		...(goal.announced === true ? [] : [TOOLS_NOTE]),
		...(isNearCap(goal.blocks, cap) ? [capNote(goal.blocks, cap)] : [])
	];
	goal.announced = true;
	return notes;
}

/**
 * Counts the goal's Stop-hook blocks per turn and, near the cap, adds a note
 * to the block's feedback row telling the model to finish, clear with
 * evidence or pause. It also notices when the evaluator judged the goal met,
 * and ends the turn when a goal the model paused or cleared blocks again.
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
			typeof text === "string" &&
			tracker.ended !== undefined &&
			tracker.turnId !== undefined &&
			text.startsWith(`${FEEDBACK}${tracker.ended}]`)
		) {
			// The model paused or cleared this goal; the engine's clear waits for
			// the turn's end, so end the turn rather than answer more blocks.
			await $.turn.abort({ turnId: tracker.turnId });
			return next(e);
		}
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
		const notes = blockNotes(goal, cap);
		if (notes.length === 0) {
			return next(e);
		}
		return next({
			...e,
			message: {
				...e.message,
				content: [
					...e.message.content,
					...notes.map((note) => ({ type: "text" as const, text: note }))
				]
			}
		});
	}).catch(($, e, next) => {
		fault($, "goal feedback", next.error);
		return next(e);
	});
}
