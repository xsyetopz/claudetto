/**
 * Caps the effort of each model request. Thinking is most of what claudetto
 * writes on claude 2.1.329 (about 4,200 of 6,300 output tokens a run on the
 * eval suite). Haiku 5.5 takes effort per message: the level on the step that
 * carries the user's input holds for the tool steps after it, and a level on a
 * tool step alone is not sent, so the cap applies to the whole turn. No step
 * is raised, and a number passes unchanged.
 */

import type { On } from "claude-code";

type Level = "low" | "medium" | "high" | "xhigh" | "max";

const ORDER: readonly Level[] = ["low", "medium", "high", "xhigh", "max"];

/** The highest level a request goes out with. */
const EFFORT_CAP: Level = "medium";

/**
 * The effort a step goes out with: the lower of the session's level and
 * {@link EFFORT_CAP}.
 *
 * @param effort The level the session set for the step.
 * @returns The level to send, or `undefined` to send the step as it is.
 */
function cappedEffort(effort: Level | number | undefined): Level | undefined {
	if (typeof effort !== "string") {
		return undefined;
	}
	return ORDER.indexOf(effort) > ORDER.indexOf(EFFORT_CAP)
		? EFFORT_CAP
		: undefined;
}

/** Registers the effort cap on every model request, main loop and subagents. */
export function registerStepEffort(on: On): void {
	on("turn.step", async function* (_$, e, next) {
		const effort = cappedEffort(e.effort);
		return yield* next(effort === undefined ? e : { ...e, effort });
	});
}
