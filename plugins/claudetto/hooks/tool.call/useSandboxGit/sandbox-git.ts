import type { EngineInterface } from "claude-code";

import type { CallAnswer, CallEvent, CallNext } from "../../chain";
import type { Run } from "../../classic.SessionStart/useHygieneSweep/worktrees";
import { withoutGitOptions } from "../../shell/program-at";
import { parse, programOf } from "../../shell/shell-words";
import { fieldOf } from "../../shell/verdict";
import { GIT_CLOSED } from "../../texts-gate";

/** Runs a command on the host and answers its stdout when it exits 0; a call that fails is logged. */
function runOf($: EngineInterface): Run {
	return async (argv, cwd) => {
		const awaited = await $.process
			.run([...argv], { cwd })
			.catch((error: unknown) => {
				$.ui.log(`The ${argv[0]} call failed (${String(error)})`);
			});
		return awaited?.exitCode === 0 ? awaited.stdout : undefined;
	};
}

const ASSIGNED = /^([A-Za-z_]\w*)=(.*)$/su;
const VARIABLE = /\$(?:\{(\w+)\}|(\w+))/gu;
const BRANCH_FLAGS = new Set(["-b", "-B", "-c", "-C"]);

/** The path each `git worktree add [-b name] <path>` of a command makes, with the variables that earlier assignment-only commands of the call set put in; any other variable stays as written. */
const worktreePaths = (command: string): string[] => {
	const set = new Map<string, string>();
	return parse(command).commands.flatMap((c) => {
		const words = c.words.map((w) =>
			w.replaceAll(
				VARIABLE,
				(whole, braced?: string, bare?: string) =>
					set.get(braced ?? bare ?? "") ?? whole,
			),
		);
		const assigned = words.map((w) => ASSIGNED.exec(w));
		if (assigned.every((m) => m !== null)) {
			for (const [, name = "", value = ""] of assigned) {
				set.set(name, value);
			}
		}
		const { name, args } = programOf({ ...c, words });
		const [verb, sub, ...rest] = name === "git" ? withoutGitOptions(args) : [];
		return verb === "worktree" && sub === "add"
			? (rest.find(
					(a, i) => !a.startsWith("-") && !BRANCH_FLAGS.has(rest[i - 1] ?? ""),
				) ?? [])
			: [];
	});
};

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
	if (worktreePaths(fieldOf(e, "command") ?? "").length > 0) {
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
