import type { EngineInterface } from "claude-code";

import type { CallAnswer, CallEvent, CallNext } from "../../chain.ts";
import { runOf } from "../../cleanup.ts";
import { GIT_CLOSED } from "../../texts-gate.ts";
import { createdOf } from "../../tool.check/useBashRules/processes.ts";

/** Per project root: whether it held no `.git` at its first Bash call and the agent has not been told yet. */
export type SandboxGitState = Map<string, boolean>;

export const sandboxGitState = (): SandboxGitState => new Map();

/**
 * Ends two refusals of the sandbox, which fixes its `.git` rules when the session starts. It denies the `worktrees` folder once the worktrees of
 * the start are gone, so the folder is made on the host before a `git worktree add`. It denies all of `.git` in a root that held none at the
 * start, so the first result after `.git` appears there names the restart.
 */
export async function sandboxGitCall(
	$: EngineInterface,
	e: CallEvent,
	next: CallNext,
	state: SandboxGitState,
): Promise<Awaited<CallAnswer>> {
	if (e.tool !== "Bash") {
		return next(e);
	}
	const root = await $.session.root();
	const git = `${root}/.git`;
	if (!state.has(root)) {
		state.set(root, !(await $.fs.exists(git)));
	}
	if (createdOf([{ tool: e.tool, input: e }]).paths.length > 0) {
		const run = runOf($);
		const dir = await run(
			["git", "rev-parse", "--path-format=absolute", "--git-common-dir"],
			root,
		);
		if (dir !== undefined) {
			await run(["mkdir", "-p", `${dir.trim()}/worktrees`], root);
		}
	}
	const answer = await next(e);
	if (
		answer.deny !== undefined ||
		state.get(root) !== true ||
		!(await $.fs.exists(git))
	) {
		return answer;
	}
	state.set(root, false);
	return { ...answer, context: [...(answer.context ?? []), GIT_CLOSED] };
}
