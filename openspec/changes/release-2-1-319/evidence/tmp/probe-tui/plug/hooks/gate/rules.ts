import {
	GATE_DOWNLOAD_RUN,
	GATE_ENV_DUMP,
	GATE_ENV_VALUES,
	GATE_PUSH_REWRITE,
	GATE_READ_FILE,
	GATE_ROOT_DELETE,
	GATE_SYSTEM_WRITE,
	GATE_UNREADABLE,
	GATE_WRITE_FILE,
	gateLosesWork,
} from "../texts.ts";
import { isEnvName, namesOnly } from "./env.ts";
import { packageVerdict } from "./packages.ts";
import { type Command, parse, programOf, SHELLS } from "./shell-words.ts";
import { ask, deny, type Verdict } from "./verdict.ts";

const NO_VALUES = new Set(
	"echo printf ls test [ touch stat rm unlink chmod chown wc cp mv ln mkdir source .".split(
		" ",
	),
);
const MATCHERS = new Set(["grep", "egrep", "fgrep", "rg", "sed", "awk"]);
const LISTERS = new Set(["grep", "egrep", "fgrep", "rg"]);
const GIT_PRINTS = new Set([
	"show",
	"diff",
	"log",
	"blame",
	"grep",
	"cat-file",
]);
const GIT_VALUED = new Set([
	"-C",
	"-c",
	"--git-dir",
	"--work-tree",
	"--namespace",
	"--super-prefix",
	"--config-env",
]);
const DOWNLOADERS = new Set(["curl", "wget"]);
const ROOTS = new Set(["/", "/*", "~", "~/", "$HOME"]);
const SYSTEM = [
	"/etc",
	"/usr",
	"/bin",
	"/sbin",
	"/boot",
	"/System",
	"/Library",
];
const FILE_REDIRECTS = new Set([">", ">|", "&>"]);
const PATTERN_FLAGS = new Set(["-e", "--regexp", "-f", "--file"]);
const NO_OUTPUT_FLAGS = new Set(["-c", "-l", "-L", "-q", "--count", "--quiet"]);

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

const operands = (args: string[]): string[] => {
	const end = args.indexOf("--");
	return [
		...args
			.slice(0, end < 0 ? args.length : end)
			.filter((a) => !a.startsWith("-")),
		...(end < 0 ? [] : args.slice(end + 1)),
	];
};

const gitParts = (name: string, args: string[]) => {
	if (name !== "git") {
		return;
	}
	let i = 0;
	while (i < args.length && (args[i] ?? "").startsWith("-")) {
		i += GIT_VALUED.has(args[i] ?? "") ? 2 : 1;
	}
	return { verb: args[i] ?? "", rest: args.slice(i + 1) };
};

const rootDelete = (name: string, args: string[]): Verdict | undefined =>
	name === "rm" &&
	flagsOf(args).some((f) => f === "-r" || f === "-R" || f === "--recursive") &&
	operands(args).some((a) => ROOTS.has(a))
		? deny(GATE_ROOT_DELETE)
		: undefined;

const envDump = (name: string, args: string[]): Verdict | undefined =>
	(name === "env" && operands(args).every((a) => a.includes("="))) ||
	(name === "printenv" && operands(args).length === 0) ||
	(name === "export" && args.includes("-p"))
		? deny(GATE_ENV_DUMP)
		: undefined;

const gitVerdict = (name: string, args: string[]): Verdict | undefined => {
	const git = gitParts(name, args);
	if (!git) {
		return undefined;
	}
	const flags = flagsOf(git.rest);
	const { verb, rest } = git;
	if (
		(verb === "reset" && flags.includes("--hard")) ||
		(verb === "clean" && flags.some((f) => f === "-f" || f === "--force")) ||
		(verb === "checkout" && rest.includes("--") && rest.includes("."))
	) {
		return ask(gateLosesWork(verb));
	}
	const forced =
		flags.some(
			(f) => f === "-f" || f.startsWith("--force") || f === "--delete",
		) || rest.some((a) => a.startsWith("+"));
	return verb === "push" && forced ? ask(GATE_PUSH_REWRITE) : undefined;
};

/** The words of a command that name a file: a match command's pattern and `--env-file` values are not files. */
const fileWords = (name: string, args: string[]): string[] => {
	const kept = args.filter(
		(a, i) => a !== "--env-file" && args[i - 1] !== "--env-file",
	);
	const words = operands(kept);
	return MATCHERS.has(name) && !kept.some((a) => PATTERN_FLAGS.has(a))
		? words.slice(1)
		: words;
};

const printsOnlyNames = (name: string, args: string[]): boolean => {
	const flags = flagsOf(args);
	const pattern = operands(args)[0];
	return (
		flags.some((f) => NO_OUTPUT_FLAGS.has(f)) ||
		(LISTERS.has(name) &&
			flags.includes("-o") &&
			pattern !== undefined &&
			namesOnly(pattern))
	);
};

const envFile = (name: string, args: string[]): Verdict | undefined => {
	const git = gitParts(name, args);
	if (NO_VALUES.has(name) || (git && !GIT_PRINTS.has(git.verb))) {
		return undefined;
	}
	return fileWords(name, args).some(isEnvName) && !printsOnlyNames(name, args)
		? deny(GATE_ENV_VALUES)
		: undefined;
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

const printsFile = (name: string, args: string[]): boolean => {
	const files = operands(args);
	if (name === "cat" || name === "head") {
		return files.length > 0;
	}
	if (name === "tail") {
		return (
			files.length > 0 &&
			!flagsOf(args).some((f) => f === "-f" || f === "-F" || f === "--follow")
		);
	}
	return name === "sed" && flagsOf(args).includes("-n") && files.length > 1;
};

interface Scope {
	commands: Command[];
	has: (file: string) => boolean;
}

const commandVerdicts = (c: Command, scope: Scope): (Verdict | undefined)[] => {
	const { name, args } = programOf(c);
	const redirected = c.redirects.some(
		(r) => FILE_REDIRECTS.has(r.op) && !r.target.startsWith("/dev/"),
	);
	const downloaded =
		SHELLS.has(name) &&
		!args.includes("-c") &&
		c.from &&
		scope.commands.some((o) => o.into && DOWNLOADERS.has(programOf(o).name));
	return [
		rootDelete(name, args),
		envDump(name, args),
		gitVerdict(name, args),
		envFile(name, args),
		packageVerdict(name, args, scope.has),
		name === "tee" && operands(args).some(systemPath)
			? deny(GATE_SYSTEM_WRITE)
			: undefined,
		downloaded ? ask(GATE_DOWNLOAD_RUN) : undefined,
		writesWhole(name, args, redirected) ? deny(GATE_WRITE_FILE) : undefined,
		!(c.from || c.into || redirected) && printsFile(name, args)
			? deny(GATE_READ_FILE)
			: undefined,
		...c.redirects.map((r) =>
			systemPath(r.target) && r.op !== "<"
				? deny(GATE_SYSTEM_WRITE)
				: undefined,
		),
		...c.redirects.map((r) =>
			r.op === "<" && isEnvName(r.target) ? deny(GATE_ENV_VALUES) : undefined,
		),
	];
};

/** The strictest verdict of a shell command, or undefined when the gate has no objection. `has` tells whether the repo holds a file. */
export const judge = (
	command: string,
	has: (file: string) => boolean,
): Verdict | undefined => {
	const parsed = parse(command);
	if (parsed.unreadable) {
		return ask(GATE_UNREADABLE);
	}
	const found = parsed.commands
		.flatMap((c) => commandVerdicts(c, { commands: parsed.commands, has }))
		.filter((v) => v !== undefined);
	return found.find((v) => v.decision === "deny") ?? found[0];
};
