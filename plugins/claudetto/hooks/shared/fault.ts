import type { EngineInterface } from "claude-code";

/**
 * Writes a caught error to the debug log. Every catch site in claudetto calls
 * it, because a fault dropped in silence reads as a clean result (RISK-001).
 */
export function fault($: EngineInterface, where: string, err: unknown): void {
	const why = err instanceof Error ? err.message : typeof err === "object" ? JSON.stringify(err) : String(err);
	$.ui.log(`claudetto ${where} failed: ${why}`, { to: "debug" });
}
