import type {
	BackgroundTaskSummary,
	EngineInterface,
	On,
	PluginOptions,
} from "claude-code";

import { closed, taskLines } from "../../cleanup.ts";
import { switchOption } from "../../options.ts";
import {
	AGREE_OPENER,
	ASK_FORM,
	COMMAND_FORM,
	MISSING_FILES,
	STALL_STOP,
	STOP_TASKS,
} from "../../texts.ts";
import { budgetBand, budgetLine } from "../../tool.call/useBudgetRun/budget.ts";
import { gradeBlock } from "./grade.ts";
import { namedPaths } from "./named-files.ts";
import { commandForm, openItems, turnOf } from "./open-items.ts";
import { registerBlock } from "./register.ts";
import type { StopState, Turn } from "./turn.ts";

const AGREES =
	/^(?:you(?:['’]| a)re (?:right|correct)|(?:good|great|fair) (?:catch|point|call)|fair enough|agreed\b)/iu;

/** The stop that ends a turn whose stretch since the last Stop wrote no file, in place of the block that would continue it. */
const stallStop = (block: string) => ({
	preventContinuation: true as const,
	stopReason: STALL_STOP(block),
});

/** The `id` and `status` of each task, so a repeat of the same list is told from a change. */
const tasksKey = (tasks: readonly BackgroundTaskSummary[]): string =>
	tasks
		.map((task) => JSON.stringify([task.id, task.status]))
		.toSorted()
		.join("\n");

const tasksText = (tasks: readonly BackgroundTaskSummary[]): string =>
	STOP_TASKS(taskLines(tasks));

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
	interactive: boolean,
): Promise<string | undefined> => {
	const reply = e.last_assistant_message ?? "";
	const form = commandForm(reply);
	if (form.stray.length > 0 || form.headless || form.several.length > 0) {
		return COMMAND_FORM(form);
	}
	const items = openItems(reply, turnOf(await $.session.messages()));
	return items.length === 0 || !interactive ? undefined : ASK_FORM(items);
};

const filesBlock = async (
	$: EngineInterface,
	e: { readonly last_assistant_message?: string | undefined },
) => {
	const named = namedPaths(e.last_assistant_message ?? "");
	const home = named.some(({ path }) => path.startsWith("~/"))
		? await $.env.get("HOME")
		: "";
	const found = await Promise.all(
		named.map(({ path }) =>
			$.fs
				.exists(path.startsWith("~/") ? `${home}${path.slice(1)}` : path)
				// The engine refuses a word that is no path it reaches, such as a search pattern, and that word names no missing file.
				.catch((error: unknown) => {
					$.ui.log(`The path ${path} was not checked (${String(error)})`);
					return true;
				}),
		),
	);
	const missing = named.filter((_, i) => found[i] !== true);
	return missing.length > 0 ? MISSING_FILES(missing) : undefined;
};

const stopBlock = async (
	$: EngineInterface,
	e: Parameters<typeof gradeBlock>[1],
	turn: Turn,
	isOpenItemsOn: boolean,
): Promise<string | undefined> =>
	(AGREES.test(e.last_assistant_message?.trim() ?? "")
		? AGREE_OPENER
		: undefined) ??
	(await filesBlock($, e)) ??
	(isOpenItemsOn ? await openBlock($, e, turn.interactive) : undefined) ??
	(await gradeBlock($, e, turn.denied, turn.interactive)) ??
	(await registerBlock($, e, turn.denied));

/**
 * Stop: the stall rule, then the named-files, open-items, and graded-reply checks, then the background-task list, then the cleanup of what the session created. The flag, the task key and
 * the budget band sit in this closure: no `await` stands between a read and its write.
 */
export const stopHooks = (
	on: On,
	options: PluginOptions,
	state: StopState,
): void => {
	const isOpenItemsOn = switchOption(options, "openItemsCheckEnabled");
	const noticeTasks = tasksNotice();
	const { turn } = state;
	on("session.start", { isInteractive: [true, false] }, (_$, e, next) => {
		turn.interactive = e.isInteractive;
		return next(e);
	});
	on("classic.Stop", async ($, e, next) => {
		const stretchWrote = turn.wrote;
		turn.wrote = false;
		const answer = await next(e);
		if (answer.block !== undefined) {
			return stretchWrote ? answer : stallStop(answer.block);
		}
		if (e.stop_hook_active) {
			return closed($, e, answer);
		}
		const block = await stopBlock($, e, turn, isOpenItemsOn);
		if (block !== undefined) {
			return { ...answer, block };
		}
		return closed($, e, noticeTasks(answer, e.background_tasks ?? []));
	});
};

/** A subagent's final report is the lead's input: the same check runs before the lead reads it. A worker's last turn removes what it created. */
export const subagentStopHooks = (on: On): void => {
	on("classic.SubagentStop", async ($, e, next) => {
		const answer = await next(e);
		const absent = e.stop_hook_active ? undefined : await filesBlock($, e);
		return absent === undefined
			? closed($, e, answer, e.agent_id)
			: { ...answer, block: absent };
	});
};

export const budgetHooks = (on: On): void => {
	let band = "";
	// Rides the prompt, which costs a request already; `classic.Stop` would cost its own.
	on("prompt.submit", async ($, e, next) => {
		const usage = await $.session.usage().catch((error: unknown) => {
			$.ui.log(`The session usage was not read (${String(error)})`);
		});
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
