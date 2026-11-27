import type { EngineInterface } from "claude-code";

function describe(err: unknown): string {
	if (err instanceof Error) {
		return err.message;
	}
	if (typeof err === "object") {
		return JSON.stringify(err);
	}
	if (typeof err === "symbol") {
		return err.toString();
	}
	if (typeof err === "string") {
		return err;
	}
	if (
		typeof err === "number" ||
		typeof err === "boolean" ||
		typeof err === "bigint"
	) {
		return String(err);
	}
	return typeof err === "function" ? err.toString() : "undefined";
}

/**
 * Writes a caught error to the debug log. Every catch site of this plugin calls
 * it, because a fault dropped in silence reads as a clean result (RISK-001).
 * The line goes to debug only, so what the person sees matches the builtin.
 */
export function fault($: EngineInterface, where: string, err: unknown): void {
	const why = describe(err);
	try {
		$.ui.log(`${where} failed: ${why}`, {
			to: "debug"
		});
	} catch {
		// the log is the last resort; a failure here must not break the fail-open path
	}
}

/** A promise `.catch` handler that logs the fault and resolves to `undefined`. */
export function swallow(
	$: EngineInterface,
	where: string
): (err: unknown) => undefined {
	return (err): undefined => {
		fault($, where, err);
	};
}
