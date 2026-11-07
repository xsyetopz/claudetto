import {
	GATE_KILL_BROAD,
	GATE_RELEASE_RUN,
	gateBranchDelete,
	gateKillPid,
	gateRmTmp,
	gateWorktreeRemove,
} from "../texts.ts";
import { type Command, parse, programOf } from "./shell-words.ts";
import { withoutGitOptions } from "./upstream.ts";
import { deny, fieldOf, type Verdict } from "./verdict.ts";

// Flags of `kill` that take the next word as their value.
const VALUED = new Set(["-s", "-n", "-q"]);
// A `&` that backgrounds a command (not `&&`, `2>&1`, or `&>`), or `$!`, the pid of the last background command.
const BACKGROUNDS = /\$!|(?<![>&])&(?![&>0-9])/;
// A released program lives at `<data>/claude/versions/<version>`; the `cc-inspect` `code` action `installs` lists them.
const FLAG = /^-[A-Za-z0-9]/;
const PROBE = /^-[0lL]$/;
const PID = /^\d+$/;
const TMP_TOP = /^(?:\/private)?\/tmp(?:\/[^/]+)?/;
const TMP_TOPS = /(?:\/private)?\/tmp\/[^/\s'"]+/g;
const DOTDOT = /(?:^|\/)\.\.(?:\/|$)/;
const AGENT_ID = /\bagentId: (\w+)/;
const WORKER_PATH = /(?:^|\/)\.claude\/worktrees\/agent-(\w+)\/?$/;
const RELEASE = /(?:^|\/)claude\/versions\/[^/\s]+/;

interface Past {
	tool: string;
	input: unknown;
	text?: string;
	isError?: true;
}

const targetsOf = (args: string[]): string[] => {
	const targets: string[] = [];
	for (let i = 0; i < args.length; i++) {
		const a = args[i] ?? "";
		if (a === "--") {
			return [...targets, ...args.slice(i + 1)];
		}
		if (VALUED.has(a)) {
			i++;
		} else if (!FLAG.test(a)) {
			targets.push(a);
		}
	}
	return targets;
};

/** Tells whether an earlier call of this session started the process: a Bash call that ran something in the background and whose result printed the pid. */
export const startedBy =
	(past: Past[]) =>
	(pid: string): boolean => {
		const shown = new RegExp(`(?<![\\w.])${pid}(?![\\w.])`);
		return past.some(
			(t) =>
				t.tool === "Bash" &&
				!t.isError &&
				BACKGROUNDS.test(fieldOf(t.input, "command") ?? "") &&
				shown.test(t.text ?? ""),
		);
	};

/** Denies `pkill`, `killall`, and a `kill` of a pid that no result of this session shows it started. A job (`%1`), `$!`, a signal check (`-0`), and `kill -l` pass. */
export const killVerdict = (
	name: string,
	args: string[],
	started: (pid: string) => boolean,
): Verdict | undefined => {
	if (name === "pkill" || name === "killall") {
		return deny(GATE_KILL_BROAD);
	}
	if (name === "xargs" && args.includes("kill")) {
		return deny(gateKillPid("each pid from the list"));
	}
	if (name !== "kill" || args.some((a) => PROBE.test(a))) {
		return undefined;
	}
	const stranger = targetsOf(args).find(
		(t) => !(t.startsWith("%") || t === "$!" || (PID.test(t) && started(t))),
	);
	return stranger === undefined ? undefined : deny(gateKillPid(stranger));
};

/** Denies running a released Claude Code program, which `cc-inspect` reads. The installed `claude` command is no path under the versions folder, so `claude --help` passes. */
export const releaseVerdict = (c: Command): Verdict | undefined =>
	RELEASE.test(c.words[programOf(c).at] ?? "")
		? deny(GATE_RELEASE_RUN)
		: undefined;

/** What this session owns: a started process, a /tmp folder with its marker, a created worktree path, a created branch. */
export interface Owns {
	pid: (pid: string) => boolean;
	tmp: (top: string) => boolean;
	path: (path: string) => boolean;
	branch: (name: string) => boolean;
}

export const NOBODY: Owns = {
	pid: () => false,
	tmp: () => false,
	path: () => false,
	branch: () => false,
};

/** The top folders below /tmp that a command names, whose marker file the caller reads. */
export const tmpTops = (command: string): string[] =>
	command.match(TMP_TOPS) ?? [];

const BRANCH_FLAGS = new Set(["-b", "-B", "-c", "-C"]);

/** The path and branch a `git` command creates: `worktree add [-b name] <path>`, `branch <name>`, `checkout -b <name>`, `switch -c <name>`. */
const creates = (args: string[]): { path?: string; branch?: string } => {
	const [verb = "", ...rest] = withoutGitOptions(args);
	const at = rest.findIndex((a) => BRANCH_FLAGS.has(a));
	const named = at < 0 ? undefined : rest[at + 1];
	if (verb === "worktree" && rest[0] === "add") {
		const words = rest.slice(1);
		return {
			branch: named,
			path: words.find(
				(a, i) => !a.startsWith("-") && !BRANCH_FLAGS.has(words[i - 1] ?? ""),
			),
		};
	}
	if (verb === "branch" && rest.length > 0 && !rest[0]?.startsWith("-")) {
		return { branch: rest[0] };
	}
	return verb === "checkout" || verb === "switch" ? { branch: named } : {};
};

/** What the non-error calls of this session made or started, and which /tmp folders carry its marker. */
export const ownsOf = (past: Past[], marked: Set<string>): Owns => {
	const made = past
		.filter((t) => t.tool === "Bash" && !t.isError)
		.flatMap((t) =>
			parse(fieldOf(t.input, "command") ?? "").commands.map((c) => {
				const { name, args } = programOf(c);
				return name === "git" ? creates(args) : {};
			}),
		);
	const entered = past.filter((t) => t.tool === "EnterWorktree" && !t.isError);
	// Claude Code makes an isolated worker's worktree itself, at `.claude/worktrees/agent-<id>` on branch `worktree-agent-<id>`.
	const workers = past
		.filter((t) => t.tool === "Agent" && !t.isError)
		.flatMap((t) => AGENT_ID.exec(t.text ?? "")?.[1] ?? []);
	return {
		pid: startedBy(past),
		tmp: (top) => marked.has(top),
		path: (path) =>
			made.some((m) => m.path === path) ||
			entered.some((t) => t.text?.includes(path)) ||
			workers.some((id) => WORKER_PATH.exec(path)?.[1] === id),
		branch: (name) =>
			made.some((m) => m.branch === name) ||
			workers.some((id) => name === `worktree-agent-${id}`),
	};
};

const isForceDelete = (flags: string[]): boolean =>
	flags.includes("-D") ||
	(flags.some((f) => f === "-d" || f === "--delete") &&
		flags.some((f) => f === "-f" || f === "--force"));

const plain = (words: string[]): string[] =>
	words.filter((w) => !w.startsWith("-"));

/** Denies `rm` under /tmp of a top folder without this session's marker, `git worktree remove` of a path this session did not create, and a forced branch delete of a branch it did not create. */
export const ownedVerdict = (
	name: string,
	args: string[],
	own: Owns,
): Verdict | undefined => {
	if (name === "rm") {
		const path = plain(args).find((p) => {
			const top = TMP_TOP.exec(p)?.[0];
			return top !== undefined && (DOTDOT.test(p) || !own.tmp(top));
		});
		return path === undefined ? undefined : deny(gateRmTmp(path));
	}
	const [verb = "", ...rest] = name === "git" ? withoutGitOptions(args) : [];
	if (verb === "worktree" && rest[0] === "remove") {
		const path = plain(rest.slice(1))[0];
		return path === undefined || own.path(path)
			? undefined
			: deny(gateWorktreeRemove(path));
	}
	if (
		verb === "branch" &&
		isForceDelete(rest.filter((w) => w.startsWith("-")))
	) {
		const stranger = plain(rest).find((b) => !own.branch(b));
		return stranger === undefined
			? undefined
			: deny(gateBranchDelete(stranger));
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

/** Tells whether a command only removes /tmp folders or force-deletes branches that this session owns; the vendored rules `fs:recursively_delete` and `git:force_delete_branch` then do not apply. */
export const ownedRemoval = (c: Command, own: Owns): boolean => {
	const { name, args } = programOf(c);
	if (ownedVerdict(name, args, own)) {
		return false;
	}
	if (ownedMove(name, args, own)) {
		return true;
	}
	if (name === "rm") {
		return plain(args).length > 0 && plain(args).every((p) => TMP_TOP.test(p));
	}
	const [verb = "", ...rest] = name === "git" ? withoutGitOptions(args) : [];
	return (
		verb === "branch" && isForceDelete(rest.filter((w) => w.startsWith("-")))
	);
};
