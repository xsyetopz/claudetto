import type { CatchHandler, HookFor } from "claude-code";

// These tools change nothing, so a note before them would stop no harm.
export const READERS: ReadonlySet<string> = new Set([
	"Read",
	"Grep",
	"Glob",
	"ToolSearch",
	"WebSearch",
	"WebFetch",
	"ListAgents",
]);

type CallCatch = CatchHandler<HookFor<"tool.call">>;

// The engine hands a `.catch` handler `$` first, which the lint's catch-name rule takes for an error.
export function sideCheckFault(
	$: Parameters<CallCatch>[0],
	e: Parameters<CallCatch>[1],
	next: Parameters<CallCatch>[2],
): ReturnType<CallCatch> {
	$.ui.log(`The side check failed (${next.error.message ?? next.error.kind})`);
	return next(e);
}
