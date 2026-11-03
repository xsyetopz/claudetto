import type { EngineInterface, On } from "claude-code";
import type { Block, BlockContext } from "../block.ts";

export const worktreeBase: Block = {
	id: "worktree-base",
	kind: "session",
	routes: ["classic.SubagentStart", "tool.call", "process.run"],
	needs: "2.1.314",
};

/** Claude Code puts each worktree it makes under this folder of the checkout it was made from. */
const WORKTREES = "/.claude/worktrees/";

const GIT_MS = 10_000;

/** The checkout a worktree under `.claude/worktrees/` was made from, or `undefined` for any other folder. */
export const checkoutOf = (worktree: string): string | undefined => {
	const at = worktree.lastIndexOf(WORKTREES);
	return at > 0 ? worktree.slice(0, at) : undefined;
};

export interface Bases {
	readonly worktree: string;
	readonly base: string;
	readonly checkout: string;
	readonly branch: string;
	readonly tip: string;
}

const short = (sha: string): string => sha.slice(0, 7);

/** For the model in the worktree: the two commits, the reason, and the command that moves the worktree onto the tip. */
export const contextLine = (b: Bases): string =>
	`This worktree starts at \`${short(b.base)}\`, and \`${b.branch}\` of \`${b.checkout}\` is at \`${short(b.tip)}\`, which this worktree lacks. Claude Code bases a new worktree on \`origin/<default branch>\` while the \`worktree.baseRef\` setting is not \`"head"\`. When the task is about \`${b.branch}\`, run \`git merge --ff-only ${short(b.tip)}\` here before the first edit, so the work starts from that branch.`;

/** For the user: the worktree, both commits, and the setting that bases worktrees on the current branch. */
export const logLine = (b: Bases): string =>
	`claudetto: the worktree ${b.worktree} starts at ${short(b.base)}, without ${b.branch} at ${short(b.tip)}. Set \`worktree.baseRef\` to \`"head"\` in the settings to base new worktrees on the current branch.`;

const git = async (
	$: EngineInterface,
	dir: string,
	args: readonly string[],
): Promise<{ code: number; out: string }> => {
	const result = await $.process.run(["git", "-C", dir, ...args], {
		timeoutMs: GIT_MS,
	});
	return { code: result.exitCode ?? 1, out: result.stdout.trim() };
};

/** The bases of `worktree` when it lacks the tip of its checkout's branch; `undefined` when it holds it, or when `git` cannot tell. */
export const missingTip = async (
	$: EngineInterface,
	worktree: string,
): Promise<Bases | undefined> => {
	const checkout = checkoutOf(worktree);
	if (checkout === undefined) {
		return undefined;
	}
	try {
		const [tip, branch, base] = await Promise.all([
			git($, checkout, ["rev-parse", "HEAD"]),
			git($, checkout, ["rev-parse", "--abbrev-ref", "HEAD"]),
			git($, worktree, ["rev-parse", "HEAD"]),
		]);
		if (tip.code !== 0 || branch.code !== 0 || base.code !== 0) {
			return undefined;
		}
		const holds = await git($, worktree, [
			"merge-base",
			"--is-ancestor",
			tip.out,
			"HEAD",
		]);
		// Exit 1 is the answer "not an ancestor"; any other failure tells nothing.
		return holds.code === 1
			? { worktree, base: base.out, checkout, branch: branch.out, tip: tip.out }
			: undefined;
	} catch {
		return undefined;
	}
};

const worktreeOf = (response: unknown): string | undefined =>
	typeof response === "object" &&
	response !== null &&
	"worktreePath" in response &&
	typeof response.worktreePath === "string"
		? response.worktreePath
		: undefined;

/** Logs the bases for the user and returns the line for the model, or `undefined` when there is nothing to tell. */
const tell = (
	$: EngineInterface,
	bases: Bases | undefined,
): string | undefined => {
	if (bases === undefined) {
		return undefined;
	}
	$.ui.log(logLine(bases));
	return contextLine(bases);
};

export const attachWorktreeBase = (on: On, _context: BlockContext): void => {
	// `agent.spawn` cannot carry this: the worktree is made beneath its `next`, and it has no context to add.
	on("classic.SubagentStart", async ($, e, next) => {
		const answer = await next(e);
		const line = tell(
			$,
			e.cwd === undefined ? undefined : await missingTip($, e.cwd),
		);
		return line === undefined
			? answer
			: {
					...answer,
					additionalContext: [...(answer.additionalContext ?? []), line],
				};
	});
	on("tool.call", { tool: "EnterWorktree" }, async ($, e, next) => {
		const answer = await next(e);
		const path = answer.isError ? undefined : worktreeOf(answer.result);
		const line = tell(
			$,
			path === undefined ? undefined : await missingTip($, path),
		);
		return line === undefined || answer.deny !== undefined
			? answer
			: { ...answer, context: [...(answer.context ?? []), line] };
	});
};
