import {
	GATE_BUSY_WAIT,
	GATE_KILL_BROAD,
	GATE_RELEASE_RUN,
	gateKillPid,
} from "../texts-gate.ts";
import { type Command, programOf } from "./shell-words.ts";
import { deny, fieldOf, type Verdict } from "./verdict.ts";

// Flags of `kill` that take the next word as their value.
const VALUED = new Set(["-s", "-n", "-q"]);
// A `&` that backgrounds a command (not `&&`, `2>&1`, or `&>`), or `$!`, the pid of the last background command.
const BACKGROUNDS = /\$!|(?<![>&])&(?![&>0-9])/u;
const FLAG = /^-[A-Za-z0-9]/u;
const PROBE = /^-[0lL]$/u;
const PID = /^\d+$/u;
const WAIT_LOOP = /\b(?:while|until)\b[\s\S]*\bsleep\b/u;
const TIME_LIMIT = /\bg?timeout\s+(?:-\S+\s+)*\d|\bSECONDS\b/u;
const LOOPS = new Set(["while", "until", "for"]);
// A bare `do` on its own line names no program.
const NO_OPS = new Set(["", ":", "true"]);
const PAUSES = new Set(["sleep", "read", "wait"]);
// A released program lives at `<data>/claude/versions/<version>`; the `cc-inspect` `code` action `installs` lists them.
const RELEASE = /(?:^|\/)claude\/versions\/[^/\s]+/u;

/** One earlier tool call of the session, with the text its result showed. */
export interface Past {
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

/** The loop keyword a command opens with, as `until x` and `do while y` do. */
const loopOf = (c: Command): string | undefined =>
	c.words.slice(0, programOf(c).at + 1).findLast((w) => LOOPS.has(w));

/** Denies a `while` or `until` loop whose body runs only `:` or `true` and whose condition runs no `sleep`, `read`, or `wait`: it tests its condition again at once and holds a CPU core until that turns. */
export const busyWaitVerdict = (commands: Command[]): Verdict | undefined => {
	const names = commands.map((c) => programOf(c).name);
	const kinds = commands.map((c) => loopOf(c));
	const spins = commands.some((c, at) => {
		const open = kinds.slice(0, at).findLastIndex((k) => k !== undefined);
		const done = commands.findIndex((d, i) => i > at && d.words[0] === "done");
		return (
			c.words[0] === "do" &&
			open !== -1 &&
			kinds[open] !== "for" &&
			names.slice(at, done).every((n) => NO_OPS.has(n)) &&
			!names.slice(open, at).some((n) => PAUSES.has(n))
		);
	});
	return spins ? deny(GATE_BUSY_WAIT) : undefined;
};

const NUMBER = /(?<![\w.])\d+(?![\w.])/gu;
// The pids a session shows at once; older ones are rarely still running.
const LISTED = 8;

/** The pids that the non-error Bash calls of this session which ran something in the background printed, oldest first. */
export const startedPids = (past: Past[]): string[] => [
	...new Set(
		past
			.filter(
				(t) =>
					t.tool === "Bash" &&
					!t.isError &&
					BACKGROUNDS.test(fieldOf(t.input, "command") ?? ""),
			)
			.flatMap((t) => t.text?.match(NUMBER) ?? []),
	),
];

/** Tells whether an earlier call of this session started the process: a Bash call that ran something in the background and whose result printed the pid. */
export const startedBy = (past: Past[]) => {
	const pids = new Set(startedPids(past));
	return (pid: string): boolean => pids.has(pid);
};

/** Denies `pkill`, `killall`, and a `kill` of a pid that no result of this session shows it started. A job (`%1`), `$!`, a signal check (`-0`), and `kill -l` pass. */
export const killVerdict = (
	name: string,
	args: string[],
	started: (pid: string) => boolean,
	listed: readonly string[] = [],
): Verdict | undefined => {
	if (name === "pkill" || name === "killall") {
		return deny(GATE_KILL_BROAD);
	}
	if (name === "xargs" && args.includes("kill")) {
		return deny(gateKillPid("each pid from the list", listed.slice(-LISTED)));
	}
	if (name !== "kill" || args.some((a) => PROBE.test(a))) {
		return undefined;
	}
	const stranger = targetsOf(args).find(
		(t) => !(t.startsWith("%") || t === "$!" || (PID.test(t) && started(t))),
	);
	return stranger === undefined
		? undefined
		: deny(gateKillPid(stranger, listed.slice(-LISTED)));
};

/** Denies running a released Claude Code program, which `cc-inspect` reads. The installed `claude` command is no path under the versions folder, so `claude --help` passes. */
export const releaseVerdict = (c: Command): Verdict | undefined =>
	RELEASE.test(c.words[programOf(c).at] ?? "")
		? deny(GATE_RELEASE_RUN)
		: undefined;
