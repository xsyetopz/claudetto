import type { EngineInterface, On, PluginOptions } from "claude-code";

import type { CheckAnswer, CheckEvent, CheckNext } from "../chain.ts";
import {
	admitCall,
	admitStart,
	crowded,
	failedText,
	type Failures,
	type Limits,
	limitsOf,
	overtimeText,
	runningCount,
	withFailure,
} from "./admit.ts";
import { memoryLimitOf, memoryShort } from "./memory.ts";

const capOf = async ($: EngineInterface): Promise<number | undefined> => {
	const cap = Number(await $.env.get("CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS"));
	return Number.isFinite(cap) && cap > 0 ? cap : undefined;
};

async function heavyTokens($: EngineInterface): Promise<number | undefined> {
	try {
		const awaited = await $.session.usage();
		return awaited.context.tokens;
	} catch (error) {
		$.ui.log(`The session usage was not read (${String(error)})`);
		return undefined;
	}
}

const spawnHook = (
	on: On,
	limits: Limits,
	started: Map<string, number>,
	memory: number,
): void => {
	let starts: readonly number[] = [];
	on("agent.spawn", async ($, e, next) => {
		const crowd =
			(await memoryShort($, memory)) ??
			crowded(runningCount(await $.agent.list()), await capOf($));
		if (crowd !== undefined) {
			return { deny: crowd };
		}
		const now = await $.clock.now();
		const admitted = admitStart(starts, now, limits);
		starts = admitted.next;
		if (admitted.out !== undefined) {
			return { deny: admitted.out };
		}
		const out = await next(e);
		if (out.agentId !== undefined) {
			started.set(out.agentId, now);
		}
		return out;
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
	spawnHook(on, state.limits, state.started, state.memory);
	failureHook(on, state.limits, state.ledger);
};

/** The limits and ledgers of one registration, which the hooks and the check guard share. */
export interface HoldState {
	readonly limits: Limits;
	calls: readonly number[];
	readonly started: Map<string, number>;
	readonly ledger: { failures: Failures };
	readonly memory: number;
}

/** Makes the limits from `options` and empty ledgers. */
export const holdState = (options: PluginOptions): HoldState => ({
	limits: limitsOf(options),
	memory: memoryLimitOf(options),
	calls: [],
	started: new Map<string, number>(),
	ledger: { failures: {} },
});

/** Denies a call of an agent past its time, of a tool that keeps failing, or over the rate and context limits. */
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
	const failed =
		overtimeText(
			e.agentId === undefined ? undefined : state.started.get(e.agentId),
			now,
			limits,
		) ?? failedText(state.ledger.failures, e, now, limits);
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
