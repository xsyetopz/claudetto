import type { EngineInterface, On, PluginOptions } from "claude-code";

import type { CheckAnswer, CheckEvent, CheckNext } from "../../chain.ts";
import {
	admitCall,
	failedText,
	type Failures,
	type Limits,
	limitsOf,
	withFailure,
} from "./admit.ts";
import { memoryLimitOf, memoryProcessMaxOf, memoryShort } from "./memory.ts";

async function heavyTokens($: EngineInterface): Promise<number | undefined> {
	try {
		const awaited = await $.session.usage();
		return awaited.context.tokens;
	} catch (error) {
		$.ui.log(`The session usage was not read (${String(error)})`);
		return undefined;
	}
}

const spawnHook = (on: On, memory: number): void => {
	on("agent.spawn", async ($, e, next) => {
		const short = await memoryShort($, memory);
		return short === undefined ? next(e) : { deny: short };
	});
};

const failureHook = (
	on: On,
	limits: Limits,
	ledger: { failures: Failures },
): void => {
	// A user's interrupt did not fail by itself, so it is not counted.
	on("classic.PostToolUseFailure", async ($, e, next) => {
		if (e.is_interrupt !== true) {
			const now = await $.clock.now();
			ledger.failures = withFailure(
				ledger.failures,
				{ tool: e.tool_name, input: e.tool_input, error: e.error },
				now,
				limits.windowMs,
			);
		}
		return next(e);
	});
};

/**
 * The ledgers sit in the closure of one registration: the hooks share one process, and no `await`
 * stands between a ledger's read and its write, so no version check is needed.
 */
export const holdHooks = (on: On, state: HoldState): void => {
	spawnHook(on, state.memory);
	failureHook(on, state.limits, state.ledger);
};

/** The limits and ledgers of one registration, which the hooks and the check guard share. */
export interface HoldState {
	readonly limits: Limits;
	calls: readonly number[];
	readonly ledger: { failures: Failures };
	readonly memory: number;
	readonly memoryProcessMax: number;
}

/** Makes the limits from `options` and empty ledgers. */
export const holdState = (options: PluginOptions): HoldState => ({
	limits: limitsOf(options),
	memory: memoryLimitOf(options),
	memoryProcessMax: memoryProcessMaxOf(options),
	calls: [],
	ledger: { failures: {} },
});

/** Denies a call of a tool that keeps failing, or over the rate and context limits. */
export async function holdCheck(
	$: EngineInterface,
	e: CheckEvent,
	next: CheckNext,
	state: HoldState,
): Promise<Awaited<CheckAnswer>> {
	// A query has no `tool_use_id` and is not a call, so it counts for nothing.
	if (e.tool_use_id === undefined) {
		return next(e);
	}
	const { limits } = state;
	const now = await $.clock.now();
	const failed = failedText(state.ledger.failures, e, now, limits);
	if (failed !== undefined) {
		return { decision: "deny", reason: failed };
	}
	const tokens = await heavyTokens($);
	const admitted = admitCall(state.calls, now, tokens, limits);
	state.calls = admitted.next;
	return admitted.out === undefined
		? next(e)
		: { decision: "deny", reason: admitted.out };
}
