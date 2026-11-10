import {
	GATE_HOOK_WRITE,
	GATE_READ_FILE,
	GATE_UNREADABLE,
	GATE_WRITE_FILE,
} from "../texts.ts";
import { packageVerdict } from "./packages.ts";
import {
	killVerdict,
	markerVerdict,
	NOBODY,
	ownedRemoval,
	ownedVerdict,
	type Owns,
	releaseVerdict,
} from "./processes.ts";
import { refVerdict } from "./refs.ts";
import { type Command, parse, programOf, scriptOf } from "./shell-words.ts";
import { upstreamVerdict } from "./upstream.ts";
import { ask, deny, type Verdict } from "./verdict.ts";

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
const PLUGIN_HOOKS = /(^|\/)plugins\/[^/]+\/hooks(\/|$)/;
const FILE_REDIRECTS = new Set([">", ">|", "&>"]);
export const systemPath = (path: string): boolean =>
	SYSTEM.some((d) => path === d || path.startsWith(`${d}/`));

const flagsOf = (args: string[]): string[] => {
	const end = args.indexOf("--");
	return args
		.slice(0, end < 0 ? args.length : end)
		.filter((a) => a.startsWith("-") && a !== "-")
		.flatMap((a) =>
			a.startsWith("--")
				? [a.split("=")[0] ?? a]
				: [...a.slice(1)].map((c) => `-${c}`),
		);
};

export const operands = (args: string[]): string[] => {
	const end = args.indexOf("--");
	return [
		...args
			.slice(0, end < 0 ? args.length : end)
			.filter((a) => !a.startsWith("-")),
		...(end < 0 ? [] : args.slice(end + 1)),
	];
};

const writesWhole = (
	name: string,
	args: string[],
	redirected: boolean,
): boolean =>
	(name === "tee" && !flagsOf(args).includes("-a")) ||
	(redirected &&
		(name === "printf" ||
			name === "echo" ||
			(name === "cat" && operands(args).length === 0)));

const VALUED = {
	head: ["-n", "-c", "--lines", "--bytes"],
	tail: ["-n", "-c", "--lines", "--bytes"],
	sed: ["-e", "-f", "--expression", "--file"],
} as Record<string, string[]>;

/** The files a `head`, `tail`, `sed`, or `cat` prints: the operands without a count or a script, which is not a file. */
export const printedFiles = (name: string, args: string[]): string[] => {
	const valued = VALUED[name] ?? [];
	const rest = args.filter((_, i) => !valued.includes(args[i - 1] ?? ""));
	const files = operands(rest);
	const scripted = valued.some((f) => args.includes(f));
	return name === "sed" && !scripted ? files.slice(1) : files;
};

export const printsFile = (name: string, args: string[]): boolean => {
	const files = printedFiles(name, args);
	if (name === "cat" || name === "head") {
		return files.length > 0;
	}
	if (name === "tail") {
		return (
			files.length > 0 &&
			!flagsOf(args).some((f) => f === "-f" || f === "-F" || f === "--follow")
		);
	}
	return name === "sed" && flagsOf(args).includes("-n") && files.length > 0;
};

export const writeTargets = (
	c: Command,
	name: string,
	args: string[],
): string[] => {
	const files = operands(args);
	const edits = name === "sed" && flagsOf(args).includes("-i");
	const written =
		name === "tee" || name === "rm" || edits
			? files
			: files.slice(name === "cp" || name === "mv" ? -1 : files.length);
	return [
		...written,
		...c.redirects.filter((r) => r.op !== "<").map((r) => r.target),
	];
};

const commandVerdicts = (
	c: Command,
	has: (file: string) => boolean,
	own: Owns,
	alone: boolean,
): (Verdict | undefined)[] => {
	const { name, args } = programOf(c);
	const redirected = c.redirects.some(
		(r) => FILE_REDIRECTS.has(r.op) && !r.target.startsWith("/dev/"),
	);
	return [
		packageVerdict(name, args, has),
		refVerdict(name, args, own),
		killVerdict(name, args, own.pid),
		ownedVerdict(name, args, own),
		releaseVerdict(c),
		writeTargets(c, name, args).some((p) => PLUGIN_HOOKS.test(p))
			? ask(GATE_HOOK_WRITE)
			: undefined,
		writesWhole(name, args, redirected) ? deny(GATE_WRITE_FILE) : undefined,
		// The file is the last operand: one before it can be a `head -n` count or a `sed` script.
		alone && !redirected && printsFile(name, args)
			? deny(GATE_READ_FILE(printedFiles(name, args).at(-1) ?? ""))
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
		...parsed.commands.flatMap((c) =>
			commandVerdicts(c, has, own, parsed.commands.length === 1),
		),
		markerVerdict(command, parsed.commands, own),
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
