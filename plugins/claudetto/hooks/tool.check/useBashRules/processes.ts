import { gateRmTmp, gateWorktreeRemove } from "../../texts-gate.ts";
import { type Past, startedBy, startedPids } from "./kill.ts";
import { type Command, parse, programOf } from "./shell-words.ts";
import { withoutGitOptions } from "./upstream.ts";
import { deny, fieldOf, type Verdict } from "./verdict.ts";

const TMP_UNDER = /^(?:(?:\/private)?\/tmp|\$\{?TMPDIR\}?)(?:\/|$)/u;
// The sandbox's TMPDIR, `/tmp/claude-<uid>`, is a base like `/tmp` itself, and a glob of every entry empties one.
const TMP_BASE =
	/^(?:(?:\/private)?\/tmp(?:\/claude(?:-[\d*?]+)?)?|\$\{?TMPDIR\}?)(?:\/[*?.]*)*$/u;
const DOTDOT = /(?:^|\/)\.\.(?:\/|$)/u;
const AGENT_ID = /\bagentId: (\w+)/u;
const WORKTREE_PATH = /(?:^|\/)\.claude\/worktrees\/([^/]+)\/?$/u;
const WORKTREE_BRANCH = "worktree-";

/** What this session owns: a started process, a created worktree path, a created branch. */
export interface Owns {
	pid: (pid: string) => boolean;
	/** The pids this session's own commands started. */
	pids: () => string[];
	path: (path: string) => boolean;
	branch: (name: string) => boolean;
	/** A branch a message of the person asked to delete, by its name or as one of "the other branches". */
	asked: (name: string) => boolean;
}

export const NOBODY: Owns = {
	pid: () => false,
	pids: () => [],
	path: () => false,
	branch: () => false,
	asked: () => false,
};

const ASSIGNED = /^([A-Za-z_]\w*)=(.*)$/su;
const VARIABLE = /\$(?:\{(\w+)\}|(\w+))/gu;

/** The words of each command with the variables that earlier assignment-only commands of the same call set put in; any other variable stays as written. */
const expanded = (commands: Command[]): Command[] => {
	const set = new Map<string, string>();
	return commands.map((c) => {
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
		return { ...c, words };
	});
};

const BRANCH_FLAGS = new Set(["-b", "-B", "-c", "-C"]);

/** The path and branch a `git` command creates: `worktree add [-b name] <path>`, `branch <name>`, `checkout -b <name>`, `switch -c <name>`. */
const creates = (
	args: string[],
): { path?: string | undefined; branch?: string | undefined } => {
	const [verb = "", ...rest] = withoutGitOptions(args);
	const at = rest.findIndex((a) => BRANCH_FLAGS.has(a));
	const named = at === -1 ? undefined : rest[at + 1];
	const first = rest[0];
	if (verb === "worktree" && first === "add") {
		const words = rest.slice(1);
		return {
			branch: named,
			path: words.find(
				(a, i) => !a.startsWith("-") && !BRANCH_FLAGS.has(words[i - 1] ?? ""),
			),
		};
	}
	if (verb === "branch" && first !== undefined && !first.startsWith("-")) {
		return { branch: first };
	}
	return verb === "checkout" || verb === "switch" ? { branch: named } : {};
};

/** The worktree paths and branches the non-error calls in `past` created, and the ids of the isolated workers they started. */
export const createdOf = (past: Past[]) => {
	const made = past
		.filter((t) => t.tool === "Bash" && !t.isError)
		.flatMap((t) =>
			expanded(parse(fieldOf(t.input, "command") ?? "").commands).map((c) => {
				const { name, args } = programOf(c);
				return name === "git" ? creates(args) : {};
			}),
		);
	return {
		paths: made.flatMap((m) => m.path ?? []),
		branches: made.flatMap((m) => m.branch ?? []),
		// Claude Code makes an isolated worker's worktree itself, at `.claude/worktrees/agent-<id>` on branch `worktree-agent-<id>`.
		workers: past
			.filter((t) => t.tool === "Agent" && !t.isError)
			.flatMap((t) => AGENT_ID.exec(t.text ?? "")?.[1] ?? []),
	};
};

/** What this session owns: the processes and branches its non-error calls made or started, and the worktrees `made` names, which Claude Code's `WorktreeCreate` events gave. The caller adds the branches the person asked to delete. */
export const ownsOf = (past: Past[], made: ReadonlySet<string>): Owns => {
	const { branches } = createdOf(past);
	return {
		pid: startedBy(past),
		pids: () => startedPids(past),
		path: (path) => made.has(WORKTREE_PATH.exec(path)?.[1] ?? ""),
		branch: (name) =>
			branches.includes(name) ||
			(name.startsWith(WORKTREE_BRANCH) &&
				made.has(name.slice(WORKTREE_BRANCH.length))),
		asked: NOBODY.asked,
	};
};

const isForceDelete = (flags: string[]): boolean =>
	flags.includes("-D") ||
	(flags.some((f) => f === "-d" || f === "--delete") &&
		flags.some((f) => f === "-f" || f === "--force"));

const plain = (words: string[]): string[] =>
	words.filter((w) => !w.startsWith("-"));

/** The branches a `git branch -D` names, or none when the command is no force delete. */
export const forceDeleted = (c: Command): string[] | undefined => {
	const { name, args } = programOf(c);
	const [verb = "", ...rest] = name === "git" ? withoutGitOptions(args) : [];
	return verb === "branch" &&
		isForceDelete(rest.filter((w) => w.startsWith("-")))
		? plain(rest)
		: undefined;
};

/** Denies `rm` of a temp base itself or of a path that leaves one through `..`, and `git worktree remove` of a worktree no `WorktreeCreate` event of this session named. */
export const ownedVerdict = (
	name: string,
	args: string[],
	own: Owns,
): Verdict | undefined => {
	if (name === "rm") {
		const path = plain(args).find(
			(p) => TMP_UNDER.test(p) && (DOTDOT.test(p) || TMP_BASE.test(p)),
		);
		return path === undefined ? undefined : deny(gateRmTmp(path));
	}
	const [verb = "", ...rest] = name === "git" ? withoutGitOptions(args) : [];
	if (verb === "worktree" && rest[0] === "remove") {
		const path = plain(rest.slice(1))[0];
		return path === undefined || own.path(path)
			? undefined
			: deny(gateWorktreeRemove(path));
	}
	return undefined;
};

const HEADS = "refs/heads/";
const REF_FLAGS = new Set(["-d", "--delete", "--no-deref", "--create-reflog"]);

/** Tells whether a command moves or deletes one branch this session owns: `update-ref [-d] refs/heads/<name> ...` or `branch -f <name> ...`. The vendored `git:delete_ref` rule and the ref-move ask then do not apply. */
export const ownedMove = (name: string, args: string[], own: Owns): boolean => {
	const [verb = "", ...rest] = name === "git" ? withoutGitOptions(args) : [];
	const flags = rest.filter((w) => w.startsWith("-"));
	const [ref = ""] = plain(rest);
	if (verb === "update-ref") {
		return (
			flags.every((f) => REF_FLAGS.has(f)) &&
			ref.startsWith(HEADS) &&
			own.branch(ref.slice(HEADS.length))
		);
	}
	return (
		verb === "branch" &&
		flags.length > 0 &&
		flags.every((f) => f === "-f" || f === "--force") &&
		own.branch(ref)
	);
};

/** Tells whether a command only removes paths under a temp base, or force-deletes branches that this session owns or the person asked to delete; the vendored rules `fs:recursively_delete` and `git:force_delete_branch` then do not apply. */
export const ownedRemoval = (c: Command, own: Owns): boolean => {
	const { name, args } = programOf(c);
	if (ownedVerdict(name, args, own)) {
		return false;
	}
	if (ownedMove(name, args, own)) {
		return true;
	}
	if (name === "rm") {
		return (
			plain(args).length > 0 && plain(args).every((p) => TMP_UNDER.test(p))
		);
	}
	return forceDeleted(c)?.every((b) => own.branch(b) || own.asked(b)) ?? false;
};
