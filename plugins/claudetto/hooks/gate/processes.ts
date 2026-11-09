import {
	GATE_KILL_BROAD,
	GATE_RELEASE_RUN,
	gateKillPid,
	gateRmTmp,
	gateTmpMarker,
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
// The sandbox's TMPDIR, `/tmp/claude-<uid>`, is a base like `/tmp` itself, as the sweep reads it: a top is a folder in either.
const TMP_TOP = /^(?:\/private)?\/tmp(?:\/claude-\d+)?(?:\/[^/]+)?/;
const TMP_TOPS =
	/(?:\/private)?\/tmp\/(?:claude-\d+\/)?[^/\s'"`;|&()<>]+/g;
// A sentence can end right after a path it prints.
const TRAILING = /[.,:]+$/;
const TMP_NAMED = /^(?:\/private)?\/tmp\/(?:claude-\d+\/)?[^/]+/;
const DOTDOT = /(?:^|\/)\.\.(?:\/|$)/;
const MAKERS = new Set(["mkdir", "mktemp"]);
const MKTEMP = /\bmktemp\b/;
/** The file whose content, a session id, says which session made the /tmp folder holding it. */
export const MARKER = ".created-by-claudetto";
const WAIT_LOOP = /\b(?:while|until)\b[\s\S]*\bsleep\b/;
const TIME_LIMIT = /\bg?timeout\s+(?:-\S+\s+)*\d|\bSECONDS\b/;
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

/** Tells whether a command is a loop that sleeps until something happens with no time limit, so it never ends if that never comes. */
export const endlessWait = (command: string): boolean =>
	WAIT_LOOP.test(command) && !TIME_LIMIT.test(command);

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
	/** A /tmp folder that is there already, so a write under it makes no new folder. */
	standing: (top: string) => boolean;
	path: (path: string) => boolean;
	branch: (name: string) => boolean;
	/** A branch a message of the person asked to delete, by its name or as one of "the other branches". */
	asked: (name: string) => boolean;
}

export const NOBODY: Owns = {
	pid: () => false,
	tmp: () => false,
	standing: () => false,
	path: () => false,
	branch: () => false,
	asked: () => false,
};

/** The top folders below /tmp that a command names, whose marker file the caller reads. */
export const tmpTops = (command: string): string[] => [
	...new Set([
		...(command.match(TMP_TOPS) ?? []).map((top) => top.replace(TRAILING, "")),
		...madePaths(parse(command).commands).flatMap((p) => tmpTopOf(p) ?? []),
	]),
];

const ASSIGNED = /^([A-Za-z_]\w*)=(.*)$/s;
const VARIABLE = /\$(?:\{(\w+)\}|(\w+))/g;

/** The words of each command with the variables that earlier assignment-only commands of the same call set put in; any other variable stays as written. */
const expanded = (commands: Command[]): Command[] => {
	const set = new Map<string, string>();
	return commands.map((c) => {
		const words = c.words.map((w) =>
			w.replace(VARIABLE, (whole, braced?: string, bare?: string) => set.get(braced ?? bare ?? "") ?? whole),
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

/** The folders `mkdir` and `mktemp` name, a relative one joined to the folder an earlier `cd` or `pushd` of the same command moved to. */
const madePaths = (commands: Command[]): string[] => {
	let dir: string | undefined;
	return expanded(commands).flatMap((c) => {
		const { name, args } = programOf(c);
		const named = plain(args);
		if (name === "cd" || name === "pushd") {
			const to = named[0];
			dir = to?.startsWith("/") ? to : to && dir && `${dir}/${to}`;
			return [];
		}
		return MAKERS.has(name)
			? named.map((a) => (a.startsWith("/") || !dir ? a : `${dir}/${a}`))
			: [];
	});
};

const BRANCH_FLAGS = new Set(["-b", "-B", "-c", "-C"]);

/** The path and branch a `git` command creates: `worktree add [-b name] <path>`, `branch <name>`, `checkout -b <name>`, `switch -c <name>`. */
const creates = (
	args: string[],
): { path?: string | undefined; branch?: string | undefined } => {
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

const DELETES = /\b(?:delete|remove|drop|prune)\b/i;
const NEGATED = /\b(?:not|never|no)\b|n't\b/i;
const OTHER_BRANCHES = /\b(?:other|all)\b.*\bbranches\b/i;
const escaped = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const sentencesOf = (texts: readonly string[]): string[] =>
	texts.flatMap((t) => t.split(/[.!?]\s+|\n/));

// "Do not delete old-feature" names the branch too, so a sentence counts only when it asks for the delete and does not forbid it.
const asksDelete = (sentence: string, branch: string): boolean =>
	DELETES.test(sentence) &&
	!NEGATED.test(sentence) &&
	(OTHER_BRANCHES.test(sentence) ||
		new RegExp(`(?:^|[\\s\`'"])${escaped(branch)}(?:$|[\\s\`'".,;:!?])`).test(
			sentence,
		));

/** What the non-error calls of this session made or started, and which /tmp folders carry its marker. */
export const ownsOf = (
	past: Past[],
	marked: Set<string>,
	standing: Set<string>,
	said: readonly string[] = [],
): Owns => {
	const { paths, branches, workers } = createdOf(past);
	const entered = past.filter((t) => t.tool === "EnterWorktree" && !t.isError);
	return {
		pid: startedBy(past),
		tmp: (top) => marked.has(top),
		standing: (top) => standing.has(top),
		path: (path) =>
			paths.includes(path) ||
			entered.some((t) => t.text?.includes(path)) ||
			workers.some((id) => WORKER_PATH.exec(path)?.[1] === id),
		branch: (name) =>
			branches.includes(name) ||
			workers.some((id) => name === `worktree-agent-${id}`),
		asked: (name) => sentencesOf(said).some((s) => asksDelete(s, name)),
	};
};

/** The /tmp folders the non-error Bash calls in `past` wrote a marker into: spelled `<folder>/.created-by-claudetto` in the command, or printed by a command that ran `mktemp`. A folder another call only named is left out, since a sibling agent shares the session id. The caller still reads each marker. */
export const markedTopsOf = (past: Past[]): string[] => [
	...new Set(
		past
			.filter((t) => t.tool === "Bash" && !t.isError)
			.flatMap((t) => {
				const command = fieldOf(t.input, "command") ?? "";
				const printed = MKTEMP.test(command) ? tmpTops(t.text ?? "") : [];
				// A folder made by a relative path after `cd` is never spelled whole, and neither is the path of its marker.
				const relative = madePaths(parse(command).commands)
					.filter((p) => !command.includes(p))
					.flatMap((p) => tmpTopOf(p) ?? []);
				return [
					...tmpTops(command).filter((top) =>
						command.includes(`${top}/${MARKER}`),
					),
					...relative,
					...printed,
				].filter((top) => command.includes(MARKER) && !DOTDOT.test(top));
			}),
	),
];

/** The top folder below /tmp that a path starts with. */
export const tmpTopOf = (path: string): string | undefined =>
	TMP_NAMED.exec(path)?.[0];

/** Denies a `mkdir` or `mktemp` of a /tmp folder this session has not marked, when the same command writes no marker. */
export const markerVerdict = (
	command: string,
	commands: Command[],
	own: Owns,
): Verdict | undefined => {
	if (command.includes(MARKER)) {
		return undefined;
	}
	const path = madePaths(commands).find((a) => {
		const top = tmpTopOf(a);
		return top !== undefined && !own.tmp(top) && !own.standing(top);
	});
	return path === undefined ? undefined : deny(gateTmpMarker(path));
};

const isForceDelete = (flags: string[]): boolean =>
	flags.includes("-D") ||
	(flags.some((f) => f === "-d" || f === "--delete") &&
		flags.some((f) => f === "-f" || f === "--force"));

const plain = (words: string[]): string[] =>
	words.filter((w) => !w.startsWith("-"));

/** Denies `rm` under /tmp of a top folder without this session's marker, `git worktree remove` of a path this session did not create. */
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

/** Tells whether a command only removes /tmp folders or force-deletes branches that this session owns or the person asked to delete; the vendored rules `fs:recursively_delete` and `git:force_delete_branch` then do not apply. */
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
		verb === "branch" &&
		isForceDelete(rest.filter((w) => w.startsWith("-"))) &&
		plain(rest).every((b) => own.branch(b) || own.asked(b))
	);
};
