import type {
	BackgroundTaskSummary,
	BuiltinToolName,
	EngineInterface,
	On,
	PluginOptions,
} from "claude-code";

import { switchOption } from "../options.ts";
import { OPEN_ITEMS_ASK, STALL_STOP, STOP_TASKS } from "../texts.ts";
import { budgetBand, budgetLine } from "./budget.ts";
import { openItems, turnOf } from "./open-items.ts";

/** The tools whose result is a file the session changed. */
const WRITERS: BuiltinToolName[] = ["Edit", "NotebookEdit", "Write"];

/** A write that ran: a denied or failed one wrote nothing. */
const didWrite = (answer: {
	readonly deny?: string | undefined;
	readonly isError?: unknown;
}): boolean => answer.deny === undefined && answer.isError === undefined;

/** The stop that ends a turn whose stretch since the last Stop wrote no file, in place of the block that would continue it. */
const stallStop = (block: string) => ({
	preventContinuation: true as const,
	stopReason: STALL_STOP(block),
});

/** The `id` and `status` of each task, so a repeat of the same list is told from a change. */
const tasksKey = (tasks: readonly BackgroundTaskSummary[]): string =>
	tasks
		.map((task) => JSON.stringify([task.id, task.status]))
		.sort()
		.join("\n");

const tasksText = (tasks: readonly BackgroundTaskSummary[]): string =>
	STOP_TASKS(
		tasks.map(
			(task) =>
				`- ${task.type} \`${task.id}\` (${task.status}): ${task.description}`,
		),
	);

const withTasks = <
	A extends { readonly additionalContext?: readonly string[] },
>(
	answer: A,
	running: readonly BackgroundTaskSummary[],
): A => ({
	...answer,
	additionalContext: [...(answer.additionalContext ?? []), tasksText(running)],
});

const tasksNotice = () => {
	let seen = "";
	return <A extends { readonly additionalContext?: readonly string[] }>(
		answer: A,
		running: readonly BackgroundTaskSummary[],
	): A => {
		const key = tasksKey(running);
		const isNew = running.length > 0 && key !== seen;
		seen = isNew ? key : seen;
		return isNew ? withTasks(answer, running) : answer;
	};
};

const openBlock = async (
	$: EngineInterface,
	e: { readonly last_assistant_message?: string | undefined },
) => {
	const open = openItems(
		e.last_assistant_message ?? "",
		turnOf(await $.session.messages()),
	);
	return open.items.length > 0 || open.offer !== undefined
		? OPEN_ITEMS_ASK(open)
		: undefined;
};

/**
 * Stop: the stall rule, then the open-items check, then the background-task list. The flag, the task key and
 * the budget band sit in this closure: no `await` stands between a read and its write.
 */
export const stopHooks = (on: On, options: PluginOptions): void => {
	const isOpenItemsOn = switchOption(options, "openItemsCheckEnabled");
	let wrote = false;
	const noticeTasks = tasksNotice();
	on("tool.call", { tool: WRITERS }, async (_$, e, next) => {
		const answer = await next(e);
		wrote ||= didWrite(answer);
		return answer;
	});
	on("classic.Stop", async ($, e, next) => {
		const stretchWrote = wrote;
		wrote = false;
		const answer = await next(e);
		if (answer.block !== undefined) {
			return stretchWrote ? answer : stallStop(answer.block);
		}
		if (e.stop_hook_active) {
			return answer;
		}
		const ask = isOpenItemsOn ? await openBlock($, e) : undefined;
		if (ask !== undefined) {
			return { ...answer, block: ask };
		}
		return noticeTasks(answer, e.background_tasks ?? []);
	});
};

export const budgetHooks = (on: On): void => {
	let band = "";
	// Rides the prompt, which costs a request already; `classic.Stop` would cost its own.
	on("prompt.submit", async ($, e, next) => {
		const usage = await $.session.usage().catch(() => undefined);
		const line = usage === undefined ? undefined : budgetLine(usage);
		if (
			usage === undefined ||
			line === undefined ||
			budgetBand(usage) === band
		) {
			return next(e);
		}
		band = budgetBand(usage);
		return next({ ...e, context: [...(e.context ?? []), line] });
	});
};
