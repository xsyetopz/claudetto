import type { On } from "claude-code";
import { isCommit, threshold } from "./text";
import { isAutoOff } from "./writer";

// Per-process session state; `session.end` with reason `clear` resets it,
// because `session.start` does not fire after a clear.
const open = new Set<string>();
let boundary = false;
let background = 0;

/** Clears the boundary state, for a new conversation. */
export function resetRenewal(): void {
	open.clear();
	boundary = false;
	background = 0;
}

/**
 * Renews the main loop at a task boundary above the break-even context
 * (ADR-0178): a finished last task, a commit, or a stop with nothing open.
 * Headless `$.session.compact` rejects, so there the driver renews (ADR-0184).
 */
export function registerRenewal(on: On): void {
	on("classic.TaskCreated", async (_$, e, next) => {
		open.add(e.task_id);
		return next(e);
	}).catch(() => undefined);
	on("classic.TaskCompleted", async (_$, e, next) => {
		open.delete(e.task_id);
		if (open.size === 0) boundary = true;
		return next(e);
	}).catch(() => undefined);
	on("classic.PostToolUse", async (_$, e, next) => {
		const input = e.tool_input as { command?: unknown } | undefined;
		const response = e.tool_response as { interrupted?: unknown } | undefined;
		if (e.tool_name === "Bash" && typeof input?.command === "string" && isCommit(input.command) && response?.interrupted !== true) {
			boundary = true;
		}
		return next(e);
	}).catch(() => undefined);
	on("classic.Stop", async (_$, e, next) => {
		background = e.background_tasks?.length ?? 0;
		if (open.size === 0 && background === 0) boundary = true;
		return next(e);
	}).catch(() => undefined);
	on("turn.complete", async ($, e, next) => {
		const result = await next(e);
		if (e.agentId !== undefined || e.reason !== "answer" || !boundary || background > 0) return result;
		boundary = false;
		if (await isAutoOff($)) return result;
		const { context } = await $.session.usage();
		const limit = threshold(
			context.window,
			await $.env.get("CLAUDETTO_AUTOHANDOVER_PCT_OVERRIDE"),
			await $.env.get("CLAUDETTO_AUTO_HANDOVER_WINDOW"),
		);
		if ((context.tokens ?? 0) < limit) return result;
		try {
			await $.session.compact({ instructions: "claudetto renewal at a task boundary" });
		} catch (err) {
			await $.ui.log(`claudetto left renewal to the driver: ${err instanceof Error ? err.message : String(err)}`);
		}
		return result;
	});
}
