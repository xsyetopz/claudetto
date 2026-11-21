import type { On } from "claude-code";

import { fault } from "../shared/fault";
import { fieldOf } from "../shared/field";
import { endGoal, setGoal, type Tracker } from "./state";

/** The words `/goal` takes as `clear` (docs: code.claude.com/docs/en/goal, "Clear a goal"). */
const CLEARS = new Set(["clear", "stop", "off", "reset", "none", "cancel"]);

/** A slash command row: the transcript stores the typed command as these tags. */
const COMMAND =
	/<command-name>\/goal<\/command-name>[\s\S]*?<command-args>([\s\S]*?)<\/command-args>/u;

/** The reply the engine gives a `/goal` it refuses, such as one over the length cap. */
const REFUSED = /<local-command-stdout>Goal condition is limited/u;

/** The text of a transcript row that holds one: a user prompt or a system `local_command`. */
function textOf(row: unknown): string | undefined {
	const type = fieldOf(row, "type");
	const content =
		type === "system"
			? fieldOf(row, "content")
			: fieldOf(fieldOf(row, "message"), "content");
	return (type === "system" || type === "user") && typeof content === "string"
		? content
		: undefined;
}

/** Whether a row is the engine's record that the evaluator found the goal met. */
function isMet(row: unknown): boolean {
	const attachment = fieldOf(row, "attachment");
	return (
		fieldOf(row, "type") === "attachment" &&
		fieldOf(attachment, "type") === "goal_status" &&
		fieldOf(attachment, "met") === true
	);
}

/**
 * The goal a transcript leaves active: the last `/goal <condition>` the person typed, unless a
 * later `/goal clear` (or alias), a refusal from the engine, or a `goal_status` row with
 * `met: true` ended it. Rows that do not parse are skipped; a transcript is append-only, so a
 * torn last line costs nothing earlier.
 */
export function goalIn(transcript: string): string | undefined {
	let goal: string | undefined;
	let previous: string | undefined;
	for (const line of transcript.split("\n")) {
		let row: unknown;
		try {
			row = JSON.parse(line);
		} catch {
			continue;
		}
		if (isMet(row)) {
			goal = undefined;
			continue;
		}
		const text = textOf(row);
		if (text === undefined) {
			continue;
		}
		if (REFUSED.test(text)) {
			// The refused command was a set, so the goal before it still stands.
			goal = previous;
			continue;
		}
		const args = COMMAND.exec(text)?.[1]?.trim();
		if (args === undefined || args === "") {
			continue;
		}
		previous = goal;
		goal = CLEARS.has(args) ? undefined : args;
	}
	return goal;
}

/**
 * Seeds the tracker on resume and compact (REQ-GOAL-030). The engine restores an active goal
 * itself, but offers a plugin no read of it, and the tracker only copies `/goal` runs it sees
 * live. `classic.SessionStart` carries `source` and `transcript_path`, so the tracker reads the
 * transcript for the goal still active. `/clear` removes the engine's goal, so the tracker
 * drops its own. An unreadable transcript leaves the tracker as it was.
 */
export function registerResume(on: On, tracker: Tracker): void {
	on("classic.SessionStart", async ($, e, next) => {
		if (e.source === "clear") {
			endGoal(tracker, false);
		} else if (e.source === "resume" || e.source === "compact") {
			const condition = goalIn(await $.fs.read(e.transcript_path));
			if (condition === undefined) {
				endGoal(tracker, false);
			} else if (tracker.goal?.condition !== condition) {
				setGoal(tracker, condition);
			}
		}
		return next(e);
	}).catch(($, e, next) => {
		fault($, "goal resume", next.error);
		return next(e);
	});
}
