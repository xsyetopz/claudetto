import { GATE_KILL_BROAD, GATE_RELEASE_RUN, gateKillPid } from "../texts.ts";
import { type Command, programOf } from "./shell-words.ts";
import { deny, fieldOf, type Verdict } from "./verdict.ts";

// Flags of `kill` that take the next word as their value.
const VALUED = new Set(["-s", "-n", "-q"]);
// A `&` that backgrounds a command (not `&&`, `2>&1`, or `&>`), or `$!`, the pid of the last background command.
const BACKGROUNDS = /\$!|(?<![>&])&(?![&>0-9])/;
// A released program lives at `<data>/claude/versions/<version>`; the `cc-inspect` `code` action `installs` lists them.
const FLAG = /^-[A-Za-z0-9]/;
const PROBE = /^-[0lL]$/;
const PID = /^\d+$/;
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
