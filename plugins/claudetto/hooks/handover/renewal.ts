import type { EngineInterface, On } from "claude-code";

import { fault } from "../shared/fault";
import { fieldOf } from "../shared/field";
import { isCommit, threshold } from "./text";
import { isAutoOff, knob } from "./writer";

/** A settings value as threshold() reads it: numbers and strings pass, the rest is unset. */
const stringOf = (value: unknown): string | undefined =>
	typeof value === "number" || typeof value === "string"
		? String(value)
		: undefined;

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

function faultRenewal($: EngineInterface, error: unknown): void {
	fault($, "renewal", error);
}

/** Tracks the open tasks, so a boundary needs every one of them done. */
function registerTasks(on: On): void {
	on("classic.TaskCreated", (_$, e, next) => {
		open.add(e.task_id);
		return next(e);
	}).catch(($, _e, next) => {
		faultRenewal($, next.error);
	});
	on("classic.TaskCompleted", (_$, e, next) => {
		open.delete(e.task_id);
		if (open.size === 0) {
			boundary = true;
		}
		return next(e);
	}).catch(($, _e, next) => {
		faultRenewal($, next.error);
	});
}

/** Marks the boundary a commit and a stop with nothing open leave behind. */
function registerBoundaries(on: On): void {
	on("classic.PostToolUse", (_$, e, next) => {
		const command = fieldOf(e.tool_input, "command");
		if (
			e.tool_name === "Bash" &&
			typeof command === "string" &&
			isCommit(command) &&
			fieldOf(e.tool_response, "interrupted") !== true
		) {
			boundary = true;
		}
		return next(e);
	}).catch(($, _e, next) => {
		faultRenewal($, next.error);
	});
	on("classic.Stop", (_$, e, next) => {
		background = e.background_tasks?.length ?? 0;
		if (open.size === 0 && background === 0) {
			boundary = true;
		}
		return next(e);
	}).catch(($, _e, next) => {
		faultRenewal($, next.error);
	});
}

/**
 * Renews the main loop at a task boundary above the break-even context
 * (ADR-0178): a finished last task, a commit, or a stop with nothing open.
 * Headless `$.session.compact` rejects, so there the driver renews (ADR-0184).
 */
export function registerRenewal(on: On): void {
	registerTasks(on);
	registerBoundaries(on);
	on("turn.complete", async ($, e, next) => {
		const result = await next(e);
		if (
			e.agentId !== undefined ||
			e.reason !== "answer" ||
			!boundary ||
			background > 0
		) {
			return result;
		}
		boundary = false;
		if (await isAutoOff($)) {
			return result;
		}
		const { context } = await $.session.usage();
		const limit = threshold(
			context.window,
			await $.env.get("CLAUDETTO_AUTOHANDOVER_PCT_OVERRIDE"),
			(await $.env.get("CLAUDETTO_AUTO_HANDOVER_WINDOW")) ??
				stringOf(await knob($, "autoHandoverWindow"))
		);
		if ((context.tokens ?? 0) < limit) {
			return result;
		}
		try {
			await $.session.compact({
				instructions: "Renewal at a task boundary"
			});
		} catch (error) {
			fault($, "renewal compaction", error);
		}
		return result;
	});
}
