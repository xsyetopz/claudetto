import type { BackgroundTaskSummary, EngineInterface } from "claude-code";

import {
	agentWorktrees,
	inOrder,
	removeWorktrees,
	type Run,
} from "./classic.SessionStart/useHygieneSweep/worktrees.ts";
import { CLEANUP_LEFT, STALE_TASKS } from "./texts-gate.ts";
import { createdOf } from "./tool.check/useBashRules/processes.ts";

type Past = Parameters<typeof createdOf>[0];

export const taskLines = (tasks: readonly BackgroundTaskSummary[]): string[] =>
	tasks.map(
		(task) =>
			`- ${task.type} \`${task.id}\` (${task.status}): ${task.description}`,
	);

/** Runs a command on the host and answers its stdout when it exits 0; a call that fails is logged. */
export function runOf($: EngineInterface): Run {
	return async (argv, cwd) => {
		const awaited = await $.process
			.run([...argv], { cwd })
			.catch((error: unknown) => {
				$.ui.log(`The ${argv[0]} call failed (${String(error)})`);
			});
		return awaited?.exitCode === 0 ? awaited.stdout : undefined;
	};
}

/** The items for which `test` holds, tested in order. */
const keepInOrder = async <T>(
	items: readonly T[],
	test: (item: T) => Promise<boolean>,
): Promise<T[]> => {
	const flags = await inOrder(items, test);
	return items.filter((_, index) => flags[index] === true);
};

/**
 * Removes what one agent's own calls created: its worktrees and its branches. Plain `git worktree remove` refuses a
 * checkout with uncommitted changes and plain `git branch -d` a branch with commits the current branch lacks, so what holds work stays and is
 * returned. Ignored build folders go with their worktree.
 */
async function cleanUp(
	$: EngineInterface,
	run: Run,
	past: Past,
): Promise<string[]> {
	const cwd = await $.session.cwd();
	const { paths, branches } = createdOf(past);
	const leftPaths = await keepInOrder(
		paths,
		async (path) =>
			(await run(["git", "worktree", "remove", path], cwd)) === undefined &&
			(await $.fs.exists(path)),
	);
	const leftBranches = await keepInOrder(
		branches,
		async (branch) =>
			(await run(["git", "branch", "-d", branch], cwd)) === undefined &&
			(await run(
				["git", "show-ref", "--verify", "--quiet", `refs/heads/${branch}`],
				cwd,
			)) !== undefined,
	);
	return [...leftPaths, ...leftBranches];
}

/**
 * Removes the agent worktrees that nothing needs from the checkout the lead works in, whose branch takes the workers' commits. The list comes from
 * git, which also names a worker the transcript does not. Answers the unlocked ones that stay and that a worker of this session made: a worktree
 * another session left is the person's to judge, and naming it would block each stop.
 */
async function agentsLeft(
	$: EngineInterface,
	run: Run,
	past: Past,
): Promise<string[]> {
	const cwd = await $.session.cwd();
	const { free, kept } = await agentWorktrees(run, cwd);
	const left = [
		...(await removeWorktrees(run, cwd, free)),
		...kept.map((item) => item.path),
	];
	const { workers } = createdOf(past);
	return left.filter((path) =>
		workers.some((id) => path.endsWith(`/agent-${id}`)),
	);
}

/**
 * The answer of a stop every other check let through. `background_tasks` lists the whole session's tasks, so the agent's own are the ones whose
 * id its results printed (`ID: <id>` from Bash, `task <id>` from Monitor). A shell or monitor of its own that the reply does not name blocks the
 * stop once. The lead's stop removes the agent worktrees nothing needs, also while a worker runs, since a running worker's worktree is locked; with
 * none of its own tasks running, its leftovers are removed, and what holds work is named unless the reply already names it.
 */
export async function closed<A extends { readonly block?: string }>(
	$: EngineInterface,
	e: {
		readonly stop_hook_active: boolean;
		readonly last_assistant_message?: string | undefined;
		readonly background_tasks?: readonly BackgroundTaskSummary[] | undefined;
	},
	answer: A,
	agentId?: string,
): Promise<A> {
	if (answer.block !== undefined) {
		return answer;
	}
	const found =
		agentId === undefined
			? await $.session.messages()
			: await $.session.messages({ agentId });
	const past = "deny" in found ? [] : found.flatMap((m) => m.toolUses);
	const reply = e.last_assistant_message ?? "";
	const own = (e.background_tasks ?? []).filter((task) =>
		past.some((t) => t.text?.includes(task.id) === true),
	);
	const stale = own.filter(
		(task) => task.type !== "subagent" && !reply.includes(task.id),
	);
	if (stale.length > 0 && !e.stop_hook_active) {
		return { ...answer, block: STALE_TASKS(taskLines(stale)) };
	}
	const run = runOf($);
	const agents = agentId === undefined ? await agentsLeft($, run, past) : [];
	if (own.length > 0) {
		return answer;
	}
	const left = [...(await cleanUp($, run, past)), ...agents];
	return e.stop_hook_active || left.every((item) => reply.includes(item))
		? answer
		: { ...answer, block: CLEANUP_LEFT(left) };
}
