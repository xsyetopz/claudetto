import type { EngineInterface } from "claude-code";

/**
 * Writes a caught error to the debug log. Every catch site of this plugin calls
 * it, because a fault dropped in silence reads as a clean result (RISK-001).
 * The line goes to debug only, so what the person sees matches the builtin.
 */
export function fault($: EngineInterface, where: string, err: unknown): void {
	const why = err instanceof Error ? err.message : typeof err === "object" ? JSON.stringify(err) : String(err);
	try {
		$.ui.log(`claudetto-you-should-know ${where} failed: ${why}`, { to: "debug" });
	} catch {
		// the log is the last resort; a failure here must not break the fail-open path
	}
}

/** A promise `.catch` handler that logs the fault and resolves to `undefined`. */
export function swallow($: EngineInterface, where: string): (err: unknown) => undefined {
	return (err) => {
		fault($, where, err);
		return undefined;
	};
}
