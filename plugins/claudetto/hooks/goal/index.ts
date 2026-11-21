import type { On } from "claude-code";

import { registerCommand } from "./command";
import { registerFeedback } from "./feedback";
import type { Tracker } from "./state";
import { registerTools } from "./tools";

/**
 * Gives the person and the model control over the built-in `/goal`
 * (REQ-GOAL-001..006): a path warning at set time, a stop-cap warning in the
 * block feedback, and goal tools with an evidence check on the clear.
 */
export function registerGoal(on: On): void {
	const tracker: Tracker = {};
	registerCommand(on, tracker);
	registerFeedback(on, tracker);
	registerTools(on, tracker);
}
