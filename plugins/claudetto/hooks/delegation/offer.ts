import type { On } from "claude-code";

/**
 * Hides the engine's built-in agent types from the model, except `fork`
 * (REQ-DELEGATION-044, ADR-0099). Artemis, Athena and Heracles replace them,
 * and each hidden type drops its line from the agent listing every request
 * carries.
 */
export function registerOffer(on: On): void {
	on("agent.offer", (_$, e, next) => (e.source === "built-in" && e.agent !== "fork" ? { isOffered: false } : next(e))).catch(
		(_$, e, next) => next(e),
	);
}
