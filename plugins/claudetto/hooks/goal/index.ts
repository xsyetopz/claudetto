import type { On } from "claude-code";

import { registerCommand } from "./command";
import { registerFeedback } from "./feedback";
import { registerNudge } from "./nudge";
import { registerResume } from "./resume";
import type { Tracker } from "./state";
import { registerTools } from "./tools";

/**
 * Gives the person and the model control over the built-in `/goal`
 * (REQ-GOAL-001..006): a path warning at set time, a stop-cap warning in the
 * block feedback, goal tools with an evidence check on the clear, and a
 * delegation nudge (REQ-GOAL-030).
 */
export function registerGoal(on: On): void {
	const tracker: Tracker = {};
	registerCommand(on, tracker);
	registerFeedback(on, tracker);
	registerTools(on, tracker);
	registerNudge(on, tracker);
	registerResume(on, tracker);
}
