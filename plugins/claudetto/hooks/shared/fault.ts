import type { EngineInterface } from "claude-code";

/** A caught value as one line: an error's message, an object as JSON, a primitive as written. */
const describeError = (err: unknown): string => {
	if (err instanceof Error) {
		return err.message;
	}
	if (typeof err === "object") {
		return JSON.stringify(err);
	}
	if (
		typeof err === "string" ||
		typeof err === "number" ||
		typeof err === "boolean" ||
		typeof err === "bigint" ||
		err === undefined
	) {
		return String(err);
	}
	return typeof err;
};

/**
 * Writes a caught error to the debug log. Every catch site in claudetto calls
 * it, because a fault dropped in silence reads as a clean result (RISK-001).
 */
export function fault($: EngineInterface, where: string, err: unknown): void {
	$.ui.log(`${where} failed: ${describeError(err)}`, { to: "debug" });
}
