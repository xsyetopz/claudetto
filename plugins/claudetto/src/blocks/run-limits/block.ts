import type { EngineInterface, HookFor, On, PluginOptions } from "claude-code";
import { readTier } from "../../tiers/read.ts";
import type { Block, BlockContext, WithOptions } from "../block.ts";
import { tasksKey, tasksText } from "./background.ts";
import { budgetBand, budgetLine, slowText } from "./budget.ts";
import { withFailure } from "./failures.ts";
import { changeLedger } from "./ledger.ts";
import { openItemsAsk, unblockedItems } from "./open-items.ts";
import { type Limits, limitsOf } from "./settings.ts";
import { admitStart, crowded, runningCount } from "./spawn.ts";
import { STALL_ASK, STALL_BLOCKS, STALL_LINE, WRITERS } from "./stall.ts";

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
): Promise<Limits> =>
	limitsOf(
		options,
		await planCap($),
		Number(await $.env.get("CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS")),
	);

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

const stallRef = { plugin: "claudetto", key: "stall" } as const;

const tasksRef = { plugin: "claudetto", key: "tasks" } as const;

/**
 * Text that is the same as the last time adds tokens to every request after it and nothing the model
 * has not read, so the list is added only when a task `id` or `status` changed. A state fault adds it.
 */
const tasksChanged = async (
	$: EngineInterface,
	key: string,
): Promise<boolean> => {
	try {
		const { value } = await $.state.get(tasksRef);
		if (value === key) {
			return false;
		}
		await $.state.set(tasksRef, key);
	} catch {
		// The list is shown again and nothing else.
	}
	return true;
};

const stalledBlocks = async ($: EngineInterface): Promise<number> => {
	const { value } = await $.state.get(stallRef);
	return typeof value === "number" ? value : 0;
};

/** A count that cannot be kept is a session that is not told to stop: the block itself still reaches the model. */
const countBlock = async (
	$: EngineInterface,
	blocked: boolean,
): Promise<number> => {
	try {
		const count = blocked ? (await stalledBlocks($)) + 1 : 0;
		await $.state.set(stallRef, count);
		return count;
	} catch {
		return 0;
	}
};

/** A file written between the blocks is progress, so the count starts again; a call that errored or was refused wrote nothing. */
/** A write that ran resets the run of blocks, and a denied or failed one does not. */
const onWritten = async (
	$: EngineInterface,
	answer: { readonly deny?: string | undefined; readonly isError?: unknown },
): Promise<void> => {
	if (answer.deny === undefined && answer.isError === undefined) {
		await countBlock($, false);
	}
};

/**
 * `additionalContext` continues the turn and costs a request, so text is added once per turn, while `stop_hook_active` is not true.
 * A block is the answer of a hook beneath this one; the third in a row with no file written is shown to the user once, and
 * every block from then on asks the session for one line.
 */
export const onStop: HookFor<"classic.Stop"> = async ($, e, next) => {
	const answer = await next(e);
	const count = await countBlock($, answer.block !== undefined);
	const looped = answer.block !== undefined && count >= STALL_BLOCKS;
	if (looped && count === STALL_BLOCKS) {
		$.ui.log(STALL_LINE);
	}
	const listed =
		e.stop_hook_active === true ? undefined : tasksText(e.background_tasks);
	const added =
		listed !== undefined &&
		(await tasksChanged($, tasksKey(e.background_tasks)))
			? listed
			: undefined;
	const asked = looped
		? { ...answer, block: `${answer.block}\n${STALL_ASK}` }
		: answer;
	const open =
		e.stop_hook_active === true || asked.block !== undefined
			? []
			: unblockedItems(e.last_assistant_message ?? "");
	if (open.length > 0) {
		return { ...asked, block: openItemsAsk(open) };
	}
	return added === undefined
		? asked
		: {
				...asked,
				additionalContext: [...(asked.additionalContext ?? []), added],
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
	const slow = [slowText(usage)].filter((text) => text !== undefined);
	const speak = await changeLedger<string, boolean>(
		{
			held: () => $.state.get(bandRef),
			save: async (next_, version) =>
				(await $.state.set(bandRef, next_, { ifVersion: version })).isSet,
		},
		(held) => ({ next: band, out: held !== band }),
	);
	return next(
		speak === true
			? { ...e, context: [...(e.context ?? []), line, ...slow] }
			: e,
	);
};

export const runLimits: Block = {
	id: "run-limits",
	kind: "policy",
	routes: [
		"agent.spawn",
		"classic.PostToolUseFailure",
		"tool.call",
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
	on("tool.call", { tool: WRITERS }, async ($, e, next) => {
		const answer = await next(e);
		await onWritten($, answer);
		return answer;
	});
	on("classic.Stop", onStop);
	// Rides the prompt, which costs a request already; `classic.Stop` would cost its own.
	on("prompt.submit", onSubmitBudget);
};
