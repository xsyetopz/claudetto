import type { On } from "claude-code";

import { fault } from "../shared/fault";

/**
 * Hides the engine's built-in agent types from the model, except `fork`
 * (REQ-DELEGATION-044, ADR-0099). Artemis, Hermes, Athena and Heracles replace them,
 * and each hidden type drops its line from the agent listing every request
 * carries.
 */
export function registerOffer(on: On): void {
	on("agent.offer", (_$, e, next) =>
		e.source === "built-in" && e.agent !== "fork"
			? { isOffered: false }
			: next(e)
	).catch(($, e, next) => {
		fault($, "agent offer", next.error);
		return next(e);
	});
}
