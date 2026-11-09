import type { EngineInterface, On, PluginOptions } from "claude-code";
import {
	admitCall,
	admitStart,
	crowded,
	type Failures,
	failedText,
	type Limits,
	limitsOf,
	runningCount,
	withFailure,
} from "./admit.ts";

const capOf = async ($: EngineInterface): Promise<number | undefined> => {
	const cap = Number(await $.env.get("CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS"));
	return Number.isFinite(cap) && cap > 0 ? cap : undefined;
};

const heavyTokens = async ($: EngineInterface): Promise<number | undefined> => {
	try {
		return (await $.session.usage()).context.tokens;
	} catch {
		return undefined;
	}
};

const ANY_TOOL = /./;

/**
 * The ledgers sit in the closure of one registration: the hooks share one process, and no `await`
 * stands between a ledger's read and its write, so no version check is needed.
 */
export const holdHooks = (on: On, options: PluginOptions): void => {
	const limits: Limits = limitsOf(options);
	let starts: readonly number[] = [];
	let calls: readonly number[] = [];
	let failures: Failures = {};
	on("agent.spawn", async ($, e, next) => {
		const crowd = crowded(runningCount(await $.agent.list()), await capOf($));
		if (crowd !== undefined) {
			return { deny: crowd };
		}
		const now = await $.clock.now();
		const admitted = admitStart(starts, now, limits);
		starts = admitted.next;
		return admitted.out === undefined ? next(e) : { deny: admitted.out };
	});
	// A user's interrupt did not fail by itself, so it is not counted.
	on("classic.PostToolUseFailure", async ($, e, next) => {
		if (e.is_interrupt !== true) {
			failures = withFailure(
				failures,
				{ tool: e.tool_name, input: e.tool_input, error: e.error },
				await $.clock.now(),
				limits.windowMs,
			);
		}
		return next(e);
	});
	// A query has no `tool_use_id` and is not a call, so it counts for nothing.
	on("tool.check", { tool: [ANY_TOOL] }, async ($, e, next) => {
		if (e.tool_use_id === undefined) {
			return next(e);
		}
		const now = await $.clock.now();
		const failed = failedText(failures, e, now, limits);
		if (failed !== undefined) {
			return { decision: "deny", reason: failed };
		}
		const tokens = await heavyTokens($);
		const admitted = admitCall(calls, now, tokens, limits);
		calls = admitted.next;
		return admitted.out === undefined
			? next(e)
			: { decision: "deny", reason: admitted.out };
	});
};
