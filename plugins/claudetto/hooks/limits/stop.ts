import type {
	BackgroundTaskSummary,
	BuiltinToolName,
	EngineInterface,
	On,
	PluginOptions,
} from "claude-code";
import { closed, taskLines } from "../cleanup.ts";
import { switchOption } from "../options.ts";
import { bashWritesTo } from "../pin.ts";
import {
	ASK_FORM,
	COMMAND_FORM,
	type GradeFault,
	MISSING_FILES,
	STALL_STOP,
	STOP_TASKS,
	VERIFY_BLOCK,
	VERIFY_GRADE,
} from "../texts.ts";
import { ASK_MCP, claimTurn, parseFaults } from "../verify.ts";
import { budgetBand, budgetLine } from "./budget.ts";
import { namedPaths } from "./named-files.ts";
import { commandForm, openItems, turnOf } from "./open-items.ts";

/** The project's open-issues file: an `ISSUES*.md` anywhere in the path. */
export const ISSUES_FILE = /(^|\/)ISSUES[^/]*\.md$/;

const ANY_TOOL = /^/;

/** How the CLI words a refused ask; a headless refusal repeats the ask's reason instead. */
const REFUSED =
	/^(?:Permission (?:to use|for this)|The user doesn't want to proceed with this tool use)/;

/** The tools whose result is a file the session changed. */
export const WRITERS: BuiltinToolName[] = ["Edit", "NotebookEdit", "Write"];

/** A write that ran: a denied or failed one wrote nothing. */
export const didWrite = (answer: {
	readonly deny?: string | undefined;
	readonly isError?: unknown;
}): boolean => answer.deny === undefined && answer.isError === undefined;

/** The codes sonnet grades beside `unseen`: its answers on `fallback` and `unfiled` are dropped; its `credited` vote is ORed with haiku's (18.19 replay: haiku alone missed 4 of 12, sonnet 5 of 12 but with 0 of 30 clean flags). */
const UNSEEN_PEERS: GradeFault[] = ["credited", "fallback", "unfiled"];

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
) => {
	const reply = e.last_assistant_message ?? "";
	const form = commandForm(reply);
	if (form.stray.length > 0 || form.headless) {
		return COMMAND_FORM(form);
	}
	const items = openItems(reply, turnOf(await $.session.messages()));
	if (items.length === 0) {
		return;
	}
	const names = (await $.tool.list()).map((tool) => tool.name);
	return ASK_FORM(
		names.find((name) => name === ASK_MCP) ?? "AskUserQuestion",
		items,
	);
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
	const missing = named.filter((_, i) => !found[i]);
	return missing.length > 0 ? MISSING_FILES(missing) : undefined;
};

/** The codes the haiku call is offered: a lookup this turn rules out `unchecked` and `rules`, a write to the issues file `unfiled`, an ask call `asks`; a failed last Bash call offers `unfixed`. */
export const offeredCodes = (
	looked: boolean,
	wroteIssues: boolean,
	asked: boolean,
	failed: boolean,
): GradeFault[] => [
	"credited",
	"fallback",
	"confesses",
	"jargon",
	"narrates",
	...(looked ? [] : (["unchecked", "rules"] as const)),
	...(wroteIssues ? [] : (["unfiled"] as const)),
	...(asked ? [] : (["asks"] as const)),
	...(failed ? (["unfixed"] as const) : []),
];

/**
 * The block for the faults one model call finds in the final reply. The call grades the reply against the person messages and the earlier
 * assistant messages; a fault the turn's own calls rule out (a lookup made, the issues file written) is left off the list the model sees.
 * A failed, timed-out, or unreadable answer passes.
 */
const gradeBlock = async (
	$: EngineInterface,
	e: {
		readonly last_assistant_message?: string | undefined;
		readonly background_tasks?: readonly BackgroundTaskSummary[] | undefined;
	},
	wroteIssues: boolean,
	denied: ReadonlySet<string>,
) => {
	const reply = e.last_assistant_message ?? "";
	const turn = claimTurn(await $.session.messages(), denied);
	if (reply === "") {
		return;
	}
	const codes = offeredCodes(
		turn.looked,
		wroteIssues,
		turn.asked,
		turn.failed !== "",
	);
	const grade = async (
		model: "haiku" | "sonnet",
		list: readonly GradeFault[],
		results: readonly string[],
		keep: readonly GradeFault[] = list,
	) => {
		const r = await $.model
			.complete({
				model,
				prompt: VERIFY_GRADE(
					turn.people,
					turn.shown,
					turn.user,
					reply,
					list,
					results,
					taskLines(e.background_tasks ?? []),
					turn.failed,
				),
				maxTokens: 300,
				timeoutMs: 15_000,
			})
			.catch(() => undefined);
		return r?.isAnswered
			? parseFaults(r.text, list, reply).filter((code) => keep.includes(code))
			: [];
	};
	// Haiku missed or over-flagged `unseen` on the held-out turns, so sonnet grades it, only when a tool ran. Asked for `unseen` alone,
	// sonnet flagged 8 of 39 clean replies; beside the other codes it flagged at most 1 of 39 (/tmp/probe-147), so it sees them and keeps `unseen`.
	const [found, unseen] = await Promise.all([
		grade("haiku", codes, []),
		turn.results.length > 0
			? grade("sonnet", [...UNSEEN_PEERS, "unseen"], turn.results, [
					"credited",
					"unseen",
				])
			: Promise.resolve([]),
	]);
	found.push(...unseen);
	return found.length > 0 ? VERIFY_BLOCK(found) : undefined;
};

/**
 * Stop: the stall rule, then the named-files, open-items, and graded-reply checks, then the background-task list, then the cleanup of what the session created. The flag, the task key and
 * the budget band sit in this closure: no `await` stands between a read and its write.
 */
export const stopHooks = (on: On, options: PluginOptions): void => {
	const isOpenItemsOn = switchOption(options, "openItemsCheckEnabled");
	let wrote = false;
	let wroteIssues = false;
	// A denied call reaches `tool.call` as an error, the same as one that ran and failed; only `tool.check` tells them apart.
	const denied = new Set<string>();
	const asked = new Map<string, string>();
	const noticeTasks = tasksNotice();
	on("tool.call", { tool: WRITERS }, async (_$, e, next) => {
		const answer = await next(e);
		const ok = didWrite(answer);
		wrote ||= ok;
		wroteIssues ||= ok && "file_path" in e && ISSUES_FILE.test(e.file_path);
		return answer;
	});
	on("tool.call", { tool: "Bash" }, async (_$, e, next) => {
		const answer = await next(e);
		wroteIssues ||=
			didWrite(answer) &&
			bashWritesTo(e.command, (path) => ISSUES_FILE.test(path));
		return answer;
	});
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
	on("classic.Stop", async ($, e, next) => {
		const stretchWrote = wrote;
		const stretchIssues = wroteIssues;
		wrote = false;
		wroteIssues = false;
		const answer = await next(e);
		if (answer.block !== undefined) {
			return stretchWrote ? answer : stallStop(answer.block);
		}
		if (e.stop_hook_active) {
			return closed($, e, answer, undefined);
		}
		const block =
			(await filesBlock($, e)) ??
			(isOpenItemsOn ? await openBlock($, e) : undefined) ??
			(await gradeBlock($, e, stretchIssues, denied));
		if (block !== undefined) {
			return { ...answer, block };
		}
		return closed(
			$,
			e,
			noticeTasks(answer, e.background_tasks ?? []),
			undefined,
		);
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
