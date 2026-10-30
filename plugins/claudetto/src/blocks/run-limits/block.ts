import type { EngineInterface, HookFor, On, PluginOptions } from "claude-code";
import { readTier } from "../../tiers/read.ts";
import type { Block, BlockContext, WithOptions } from "../block.ts";
import { tasksText } from "./background.ts";
import { budgetBand, budgetLine } from "./budget.ts";
import { withFailure } from "./failures.ts";
import { changeLedger } from "./ledger.ts";
import { type Limits, limitsOf } from "./settings.ts";
import { admitStart, crowded, runningCount } from "./spawn.ts";

const startsRef = { plugin: "claudetto", key: "starts" } as const;

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

const limitsFor = async (
	$: EngineInterface,
	options: PluginOptions,
): Promise<Limits> => limitsOf(options, await planCap($));

export const onSpawn: WithOptions<HookFor<"agent.spawn">> = async (
	$,
	e,
	next,
	options,
) => {
	const limits = await limitsFor($, options);
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

const failuresRef = { plugin: "claudetto", key: "failures" } as const;

/** A call the user interrupted did not fail by itself, so it is not counted. */
export const onFailed: WithOptions<
	HookFor<"classic.PostToolUseFailure">
> = async ($, e, next, options) => {
	if (e.is_interrupt !== true) {
		try {
			const now = await $.clock.now();
			const { windowMs } = limitsOf(options, undefined);
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

const bandRef = { plugin: "claudetto", key: "band" } as const;

const usageOf = async (
	$: EngineInterface,
): Promise<
	Awaited<ReturnType<EngineInterface["session"]["usage"]>> | undefined
> => {
	try {
		return await $.session.usage();
	} catch {
		return undefined;
	}
};

/** `additionalContext` continues the turn and costs a request, so text is added once per turn, while `stop_hook_active` is not true. */
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
 * Speaks only when the band changes, so an unchanged budget adds nothing to each prompt. The band sits
 * in versioned state, so two prompts at once cannot both speak; a state fault leaves the line out.
 */
export const onSubmitBudget: HookFor<"prompt.submit"> = async ($, e, next) => {
	const usage = await usageOf($);
	const line = usage === undefined ? undefined : budgetLine(usage);
	if (usage === undefined || line === undefined) {
		return next(e);
	}
	const band = budgetBand(usage);
	const speak = await changeLedger<string, boolean>(
		{
			held: () => $.state.get(bandRef),
			save: async (next_, version) =>
				(await $.state.set(bandRef, next_, { ifVersion: version })).isSet,
		},
		(held) => ({ next: band, out: held !== band }),
	);
	return next(
		speak === true ? { ...e, context: [...(e.context ?? []), line] } : e,
	);
};

export const runLimits: Block = {
	id: "run-limits",
	kind: "policy",
	routes: [
		"agent.spawn",
		"classic.PostToolUseFailure",
		"classic.Stop",
		"prompt.submit",
	],
	needs: "2.1.314",
};

export const attachRunLimits = (on: On, context: BlockContext): void => {
	on("agent.spawn", ($, e, next) => onSpawn($, e, next, context.options));
	on("classic.PostToolUseFailure", ($, e, next) =>
		onFailed($, e, next, context.options),
	);
	on("classic.Stop", onStop);
	// Rides the prompt, which costs a request already; `classic.Stop` would cost its own.
	on("prompt.submit", onSubmitBudget);
};
