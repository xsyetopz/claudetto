import type { BackgroundTaskSummary, EngineInterface } from "claude-code";
import { isMarked } from "./gate.ts";
import { createdOf, markedTopsOf } from "./gate/processes.ts";
import { CLEANUP_LEFT, STALE_TASKS } from "./texts.ts";

type Past = Parameters<typeof createdOf>[0];

export const taskLines = (tasks: readonly BackgroundTaskSummary[]): string[] =>
	tasks.map(
		(task) =>
			`- ${task.type} \`${task.id}\` (${task.status}): ${task.description}`,
	);

async function succeeds(
	$: EngineInterface,
	argv: string[],
	cwd: string,
): Promise<boolean> {
	return (
		(await $.process.run(argv, { cwd }).catch(() => undefined))?.exitCode === 0
	);
}

/**
 * Removes what one agent's own calls created: its marked /tmp folders, its worktrees, and its branches. Plain `git worktree remove` refuses a
 * checkout with uncommitted changes and plain `git branch -d` a branch with commits the current branch lacks, so what holds work stays and is
 * returned. Ignored build folders go with their worktree.
 */
async function cleanUp($: EngineInterface, past: Past): Promise<string[]> {
	const cwd = await $.session.cwd();
	for (const top of markedTopsOf(past)) {
		if (await isMarked($, top)) {
			await $.process.run(["rm", "-rf", top]);
		}
	}
	const { paths, branches, workers } = createdOf(past);
	const root = workers.length > 0 ? await $.session.root() : "";
	const left: string[] = [];
	for (const path of [
		...paths,
		...workers.map((id) => `${root}/.claude/worktrees/agent-${id}`),
	]) {
		if (
			!(await succeeds($, ["git", "worktree", "remove", path], cwd)) &&
			(await $.fs.exists(path))
		) {
			left.push(path);
		}
	}
	for (const branch of [
		...branches,
		...workers.map((id) => `worktree-agent-${id}`),
	]) {
		if (
			!(await succeeds($, ["git", "branch", "-d", branch], cwd)) &&
			(await succeeds(
				$,
				["git", "show-ref", "--verify", "--quiet", `refs/heads/${branch}`],
				cwd,
			))
		) {
			left.push(branch);
		}
	}
	return left;
}

/**
 * The answer of a stop every other check let through. `background_tasks` lists the whole session's tasks, so the agent's own are the ones whose
 * id its results printed (`ID: <id>` from Bash, `task <id>` from Monitor). A shell or monitor of its own that the reply does not name blocks the
 * stop once; with none of its own running, its leftovers are removed, and what holds work is named unless the reply already names it.
 */
export async function closed<A extends { readonly block?: string }>(
	$: EngineInterface,
	e: {
		readonly stop_hook_active: boolean;
		readonly last_assistant_message?: string | undefined;
		readonly background_tasks?: readonly BackgroundTaskSummary[] | undefined;
	},
	answer: A,
	agentId: string | undefined,
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
		past.some((t) => t.text?.includes(task.id)),
	);
	const stale = own.filter(
		(task) => task.type !== "subagent" && !reply.includes(task.id),
	);
	if (stale.length > 0 && !e.stop_hook_active) {
		return { ...answer, block: STALE_TASKS(taskLines(stale)) };
	}
	if (own.length > 0) {
		return answer;
	}
	const left = await cleanUp($, past);
	return e.stop_hook_active || left.every((item) => reply.includes(item))
		? answer
		: { ...answer, block: CLEANUP_LEFT(left) };
}
