// The hook adapters of `run-limits`: the subagent start, the failed call, and the stop. The three were
// merged because the plugin keeps one `hooks.ts` per concern folder.

import type { EngineInterface, HookFor } from "claude-code";
import { keptOptions } from "../jev/options.ts";
import { readTier } from "../tiers/read.ts";
import { tasksText } from "./background.ts";
import { budgetLine } from "./budget.ts";
import { withFailure } from "./failures.ts";
import { changeLedger } from "./ledger.ts";
import { type Limits, limitsOf } from "./settings.ts";
import { admitStart, crowded, runningCount } from "./spawn.ts";

// The hook that holds a subagent start, and the one place where the start meets `$`. The judging is
// in `spawn.ts`. `register.ts` registers the hook by reference: the engine's loader follows `$` into
// another file only through a `function` declaration, which the lint rules forbid.
//
// The starts are in `$.state`: the period belongs to the running session, and a write with a version
// keeps parallel starts from losing a count. A fault of the tier file or of the state leaves that
// limit off for the start, because a hook that throws is skipped and the start goes on (`design.md`,
// "Run Limits").

const startsRef = { plugin: "claudetto", key: "starts" } as const;

/** The cap of the plan row of this login, read from `~/.claude.json`, or none when it cannot be read. */
const planCap = async ($: EngineInterface): Promise<number | undefined> => {
	try {
		const home = await $.env.get("HOME");
		if (home === undefined) {
			return undefined;
		}
		const login: unknown = JSON.parse(await $.fs.read(`${home}/.claude.json`));
		return readTier(login).row?.subagentCap;
	} catch {
		return undefined;
	}
};

const limitsFor = async ($: EngineInterface): Promise<Limits> =>
	limitsOf(keptOptions(), await planCap($));

/**
 * `agent.spawn`: refuses a start while the agents running at once have reached the cap, or while the
 * starts of the period have. The reason names the count and the option that changes the cap. Only a
 * start that goes on is counted into the period.
 */
export const onSpawn: HookFor<"agent.spawn"> = async ($, e, next) => {
	const limits = await limitsFor($);
	const crowd = crowded(runningCount(await $.agent.list()), limits);
	if (crowd !== undefined) {
		return { deny: crowd };
	}
	const now = await $.clock.now();
	const burst = await changeLedger(
		{
			held: () => $.state.get(startsRef),
			save: async (starts, version) =>
				(await $.state.set(startsRef, starts, { ifVersion: version })).isSet,
		},
		(held) => admitStart(held, now, limits),
	);
	return burst === undefined ? next(e) : { deny: burst };
};

// The counting half of the refusal of an identical retry, and the one place where it meets `$.state`.
// The refusal itself is answered at `tool.check` in `gate/hooks.ts`, which takes one handler.
// `register.ts` registers this hook by reference: the engine's loader follows `$` into another file
// only through a `function` declaration, which the lint rules forbid.

const failuresRef = { plugin: "claudetto", key: "failures" } as const;

/**
 * `classic.PostToolUseFailure`: records the failure of a call with its error. It observes and
 * answers with `next`, and a fault of the state counts nothing. A call the user interrupted did not
 * fail by itself, so it is not counted.
 */
export const onFailed: HookFor<"classic.PostToolUseFailure"> = async (
	$,
	e,
	next,
) => {
	if (e.is_interrupt !== true) {
		try {
			const now = await $.clock.now();
			const { windowMs } = limitsOf(keptOptions(), undefined);
			await changeLedger(
				{
					held: () => $.state.get(failuresRef),
					save: async (failures, version) =>
						(await $.state.set(failuresRef, failures, { ifVersion: version }))
							.isSet,
				},
				(held) => ({
					next: withFailure(
						held,
						{ tool: e.tool_name, input: e.tool_input, error: e.error },
						now,
						windowMs,
					),
					out: undefined,
				}),
			);
		} catch {
			// The count is lost and nothing else: the failure itself reaches the model either way.
		}
	}
	return next(e);
};

// The hooks that report the background tasks still in flight and the budget left.

/** The budget line of the live session, or none when the engine has no usage to read. */
const budgetOf = async ($: EngineInterface): Promise<string | undefined> => {
	try {
		return budgetLine(await $.session.usage());
	} catch {
		return undefined;
	}
};

/**
 * `classic.Stop`: hands the model one text that lists each task of `background_tasks`, which is the
 * work a session pauses on and a monitor among it. The seam is not passive: `additionalContext` is
 * feedback that continues the turn, so each answer that adds text costs one more model request, up to
 * the cap of `CLAUDE_CODE_STOP_HOOK_BLOCK_CAP`. So the text is added only while `stop_hook_active` is
 * not true, which is once per turn, and nothing is added when no task is in flight.
 */
export const onStop: HookFor<"classic.Stop"> = async (_$, e, next) => {
	const answer = await next(e);
	const added =
		e.stop_hook_active === true ? undefined : tasksText(e.background_tasks);
	return added === undefined
		? answer
		: {
				...answer,
				additionalContext: [...(answer.additionalContext ?? []), added],
			};
};

/**
 * `prompt.submit`: puts the line of the budget left (`budget.ts`) beside the prompt, so it rides the
 * request the prompt already costs and is read anew for each prompt. It adds nothing when the engine
 * has no usage to read.
 */
export const onSubmitBudget: HookFor<"prompt.submit"> = async ($, e, next) => {
	const line = await budgetOf($);
	return next(
		line === undefined ? e : { ...e, context: [...(e.context ?? []), line] },
	);
};
