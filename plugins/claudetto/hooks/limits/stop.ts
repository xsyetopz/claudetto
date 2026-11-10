import type {
	BackgroundTaskSummary,
	BuiltinToolName,
	EngineInterface,
	On,
	PluginOptions,
} from "claude-code";

import { closed, taskLines } from "../cleanup.ts";
import { switchOption } from "../options.ts";
import {
	AGREE_OPENER,
	ASK_FORM,
	COMMAND_FORM,
	MISSING_FILES,
	STALL_STOP,
	STOP_TASKS,
} from "../texts.ts";
import { ASK_MCP } from "../verify.ts";
import { budgetBand, budgetLine } from "./budget.ts";
import { gradeBlock } from "./grade.ts";
import { namedPaths } from "./named-files.ts";
import { commandForm, openItems, turnOf } from "./open-items.ts";

const ANY_TOOL = /^/u;

/** How the CLI words a refused ask; a headless refusal repeats the ask's reason instead. */
const REFUSED =
	/^(?:Permission (?:to use|for this)|The user doesn't want to proceed with this tool use)/u;

const AGREES =
	/^(?:you(?:['’]| a)re (?:right|correct)|(?:good|great|fair) (?:catch|point|call)|fair enough|agreed\b)/iu;

/** The tools whose result is a file the session changed. */
export const WRITERS = [
	"Edit",
	"NotebookEdit",
	"Write",
] satisfies BuiltinToolName[];

/** A write that ran: a denied or failed one wrote nothing. */
export const didWrite = (answer: {
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
	return items.length === 0 || !interactive
		? undefined
		: ASK_FORM(ASK_MCP, items);
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
			$.fs.exists(path.startsWith("~/") ? `${home}${path.slice(1)}` : path),
		),
	);
	const missing = named.filter((_, i) => found[i] !== true);
	return missing.length > 0 ? MISSING_FILES(missing) : undefined;
};

/** Collects the ids of the calls a refusal ended into `denied`. A denied call reaches `tool.call` as an error, the same as one that ran and failed; only `tool.check` tells them apart. */
const watchDenials = (on: On, denied: Set<string>): void => {
	const asked = new Map<string, string>();
	on("tool.check", { tool: ANY_TOOL }, async (_$, e, next) => {
		const verdict = await next(e);
		if (e.tool_use_id !== undefined && verdict.decision === "deny") {
			denied.add(e.tool_use_id);
		}
		if (e.tool_use_id !== undefined && verdict.decision === "ask") {
			asked.set(e.tool_use_id, verdict.reason ?? "");
		}
		return verdict;
	});
	on("tool.call", { tool: ANY_TOOL }, async (_$, e, next) => {
		const answer = await next(e);
		const reason = asked.get(e.tool_use_id);
		const text = answer.text ?? "";
		if (
			answer.isError &&
			reason !== undefined &&
			(text === reason || REFUSED.test(text))
		) {
			denied.add(e.tool_use_id);
		}
		return answer;
	});
};

/**
 * Stop: the stall rule, then the named-files, open-items, and graded-reply checks, then the background-task list, then the cleanup of what the session created. The flag, the task key and
 * the budget band sit in this closure: no `await` stands between a read and its write.
 */
export const stopHooks = (on: On, options: PluginOptions): void => {
	const isOpenItemsOn = switchOption(options, "openItemsCheckEnabled");
	let wrote = false;
	const denied = new Set<string>();
	const noticeTasks = tasksNotice();
	// A headless session has no person to answer, so no ask can reach anyone.
	let interactive = true;
	on("session.start", { isInteractive: [true, false] }, (_$, e, next) => {
		interactive = e.isInteractive;
		return next(e);
	});
	on("tool.call", { tool: WRITERS }, async (_$, e, next) => {
		const answer = await next(e);
		wrote ||= didWrite(answer);
		return answer;
	});
	watchDenials(on, denied);
	on("classic.Stop", async ($, e, next) => {
		const stretchWrote = wrote;
		wrote = false;
		const answer = await next(e);
		if (answer.block !== undefined) {
			return stretchWrote ? answer : stallStop(answer.block);
		}
		if (e.stop_hook_active) {
			return closed($, e, answer);
		}
		const block =
			(AGREES.test(e.last_assistant_message?.trim() ?? "")
				? AGREE_OPENER
				: undefined) ??
			(await filesBlock($, e)) ??
			(isOpenItemsOn ? await openBlock($, e, interactive) : undefined) ??
			(await gradeBlock($, e, denied, interactive));
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
		const usage = await $.session.usage().catch(() => void 0);
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
