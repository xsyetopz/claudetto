import {
	GATE_EDIT_FILE,
	GATE_HOOK_WRITE,
	GATE_READ_FILE,
	GATE_UNREADABLE,
	GATE_WRITE_FILE,
} from "../../texts-gate";
import {
	formatVerdict,
	inPlaceTarget,
	printedFiles,
	printedRange,
	printsFile,
	writesWhole,
	writeTargets,
} from "./files";
import { busyWaitVerdict, killVerdict, releaseVerdict } from "./kill";
import { packageVerdict } from "./packages";
import { maskedExitVerdict, unstoppedCommitVerdict } from "./pipefail";
import { NOBODY, ownedRemoval, ownedVerdict, type Owns } from "./processes";
import { refVerdict } from "./refs";
import { type Command, parse, programOf, scriptOf } from "./shell-words";
import { upstreamVerdict } from "./upstream";
import { ask, deny, type Verdict } from "./verdict";

const SYSTEM = [
	"/etc",
	"/usr",
	"/bin",
	"/sbin",
	"/boot",
	"/System",
	"/Library",
];
// Claude Code's own check already asks on `.claude/` and `.git/hooks/` in every Bash form and on a Write or Edit of `plugins/`, but not on a Bash write there.
const PLUGIN_HOOKS = /(^|\/)plugins\/[^/]+\/hooks(\/|$)/u;
const FILE_REDIRECTS = new Set([">", ">|", "&>"]);
export const systemPath = (path: string): boolean =>
	SYSTEM.some((d) => path === d || path.startsWith(`${d}/`));

const VIEWERS = new Set(["cat", "head", "less", "more", "nl", "tail"]);

/** Whether a pipe ends in a program that only shows its input, so the read before it is a file read. */
const shows = (c: Command | undefined): boolean => {
	if (c === undefined) {
		return false;
	}
	const { name, args } = programOf(c);
	return (
		VIEWERS.has(name) ||
		(name === "sed" && args.some((a) => a === "-n" || a === "--quiet"))
	);
};

const commandVerdicts = (
	c: Command,
	has: (file: string) => boolean,
	own: Owns,
	next: Command | undefined,
): (Verdict | undefined)[] => {
	const { name, args } = programOf(c);
	const redirected = c.redirects.some(
		(r) => FILE_REDIRECTS.has(r.op) && !r.target.startsWith("/dev/"),
	);
	const edited = inPlaceTarget(name, args);
	return [
		formatVerdict(name, args),
		packageVerdict(name, args, has),
		refVerdict(name, args, own),
		killVerdict(name, args, own.pid, own.pids()),
		ownedVerdict(name, args, own),
		releaseVerdict(c),
		writeTargets(c, name, args).some((p) => PLUGIN_HOOKS.test(p))
			? ask(GATE_HOOK_WRITE)
			: undefined,
		writesWhole(name, args, redirected) ? deny(GATE_WRITE_FILE) : undefined,
		edited === undefined ? undefined : deny(GATE_EDIT_FILE(edited)),
		// The file is the last operand: one before it can be a `head -n` count or a `sed` script. A read piped into a program that works on it, such as `wc`, stays.
		(!c.into || shows(next)) && !redirected && printsFile(name, args)
			? deny(
					GATE_READ_FILE(
						printedFiles(name, args).at(-1) ?? "",
						printedRange(name, args),
					),
				)
			: undefined,
	];
};

const strictest = (found: (Verdict | undefined)[]): Verdict | undefined => {
	const verdicts = found.filter((v) => v !== undefined);
	return verdicts.find((v) => v.decision === "deny") ?? verdicts[0];
};

const judgeText = (
	command: string,
	parsed: ReturnType<typeof parse>,
	has: (file: string) => boolean,
	own: Owns,
): Verdict | undefined => {
	if (parsed.unreadable) {
		// The commands cannot be told apart, but the rules that read the whole text still can.
		return upstreamVerdict(command, []) ?? ask(GATE_UNREADABLE);
	}
	return strictest([
		upstreamVerdict(
			command,
			parsed.commands.filter((c) => !ownedRemoval(c, own)),
		),
		...parsed.commands.flatMap((c, i) =>
			commandVerdicts(c, has, own, c.into ? parsed.commands[i + 1] : undefined),
		),
		maskedExitVerdict(parsed.commands),
		unstoppedCommitVerdict(parsed.commands),
		busyWaitVerdict(parsed.commands),
	]);
};

/** The strictest verdict of a shell command, or undefined when the gate has no objection. `has` tells whether the repo holds a file. A script that `sh -c` or `eval` runs is judged as a command too; the parser already lists the commands of nested scripts, to its depth bound, so each script is judged once here. */
export const judge = (
	command: string,
	has: (file: string) => boolean,
	own: Owns = NOBODY,
): Verdict | undefined => {
	const parsed = parse(command);
	const scripts = parsed.commands.flatMap((c) => scriptOf(c) ?? []);
	return strictest([
		judgeText(command, parsed, has, own),
		// An unreadable script is already an ask through the outer text.
		...scripts.map((s) => {
			const p = parse(s);
			return p.unreadable ? upstreamVerdict(s, []) : judgeText(s, p, has, own);
		}),
	]);
};
