// What a simple command does with its input and arguments, for `shell.ts`:
// a shell runs them as a script, a loop or `xargs` runs their lines, a data command only reads them,
// and any other program can run them as code in a language that the reader does not know.

import { baseName, stripWrappers } from "./wrappers.ts";

export const wordSet = (words: string) => new Set(words.split(" "));

export const RESERVED = wordSet(
	"{ } ! if then else elif fi while until do done",
);

const SHELLS = /^(?:ba|z|da|k)?sh$/;

/** The commands that run the lines of their input, such as `while read c; do bash -c "$c"; done <<'X'`. */
const XARGS = wordSet("xargs parallel");

const FEEDS = new Set([...wordSet("done read mapfile readarray"), ...XARGS]);

/** The commands that only read their input and arguments as data. Any other program can run code from them. */
const DATA = wordSet(
	"cat tee echo printf git gh grep egrep fgrep rg ag jq yq head tail wc sort uniq cut tr diff cmp base64 pbcopy less column ls mkdir cd export test [ true false :",
);

const SCRIPT_FLAG = /^-[A-Za-z]*c[A-Za-z]*$/;

/** The name of the command of `argv` after the wrappers. */
export const nameOf = (argv: string[]): string =>
	baseName(stripWrappers(argv)[0] ?? "");

/** The flags of the option word `arg` (none for a word that is no option), the one of them that takes a value, and whether that value is the next word. In a short cluster (`-fe`) the first letter in `valueOpts` ends the cluster: when it is the last letter the next word is its value, otherwise the rest of the cluster is. */
export const optionOf = (
	arg: string,
	valueOpts: ReadonlySet<string>,
): { flags: string[]; value?: string; next: boolean } => {
	if (!arg.startsWith("-")) {
		return { flags: [], next: false };
	}
	if (arg.startsWith("--")) {
		const name = arg.split("=", 1)[0] ?? arg;
		return valueOpts.has(name)
			? { flags: [name], value: name, next: name === arg }
			: { flags: [name], next: false };
	}
	const flags: string[] = [];
	for (let i = 1; i < arg.length; i++) {
		const opt = `-${arg[i]}`;
		flags.push(opt);
		if (valueOpts.has(opt)) {
			return { flags, value: opt, next: i === arg.length - 1 };
		}
	}
	return { flags, next: false };
};

/** The words of `args` that are not options, with each word after `--`, and with the value of each option in `valueOpts` left out. A short cluster ends at its first letter that takes a value: `-fe` is `-f` with the file `e`, and `-qn 5` takes `5`. */
export const operands = (
	args: string[],
	valueOpts: ReadonlySet<string> = new Set<string>(),
): string[] => {
	const out: string[] = [];
	for (let i = 0; i < args.length; i++) {
		const arg = args[i] ?? "";
		if (arg === "--") {
			return [...out, ...args.slice(i + 1)];
		}
		if (!arg.startsWith("-")) {
			out.push(arg);
		} else if (optionOf(arg, valueOpts).next) {
			i++;
		}
	}
	return out;
};

/** True when `argv` is a shell with no `-c` script, so it reads a script from its standard input. */
export const readsScript = (argv: string[]): boolean =>
	SHELLS.test(nameOf(argv)) &&
	!stripWrappers(argv)
		.slice(1)
		.some((a) => SCRIPT_FLAG.test(a));

/** The script text that `argv` runs through `sh -c`, `bash -c`, or `eval`, or undefined. */
export const scriptOf = (argv: string[]): string | undefined => {
	const name = nameOf(argv);
	const args = stripWrappers(argv).slice(1);
	if (name === "eval") {
		return args.join(" ");
	}
	const at = args.findIndex((a) => SCRIPT_FLAG.test(a));
	if (!SHELLS.test(name) || at < 0) {
		return undefined;
	}
	return args[args[at + 1] === "--" ? at + 2 : at + 1];
};

/**
 * True when `argv` is a program that can run its input or arguments as code in any language, such as `python3`, `node`, or `awk`.
 * A shell, `eval`, a loop, a data command, and a command in a variable are read in other ways.
 */
export const runsCode = (argv: string[]): boolean => {
	const name = nameOf(argv);
	return !(
		["", "eval", "source", "."].includes(name) ||
		name.startsWith("$") ||
		SHELLS.test(name) ||
		FEEDS.has(name) ||
		DATA.has(name) ||
		RESERVED.has(name)
	);
};

/**
 * What the command `head` does with a heredoc body:
 * `"script"` for a shell that reads it, `"feed"` for a command that runs its lines,
 * `"code"` for a program that can run it as code, and `"data"` for a command that only reads it.
 */
export const bodyKind = (
	head: string[],
): "script" | "feed" | "code" | "data" => {
	if (readsScript(head)) {
		return "script";
	}
	const name = nameOf(head);
	if (
		FEEDS.has(name) ||
		SHELLS.test(name) ||
		head.some((w) => FEEDS.has(baseName(w)))
	) {
		return "feed";
	}
	return runsCode(head) ? "code" : "data";
};

/**
 * How much of the held text `argv` can run as a script that the reader cannot see.
 * 2 for a script from the input or a substitution (`| sh`, `source /dev/stdin`, `sh -c "$(cat)"`): each held body.
 * 1 for a script in a variable or from `xargs` (`bash -c "$c"`, `$c`), or a name that a substitution wrote (`$(echo git)` scans as `""`): each `"feed"` body.
 * 0 for none.
 */
export const hiddenLevel = (
	argv: string[],
	script: string | undefined,
): number => {
	const first = stripWrappers(argv)[0];
	const name = nameOf(argv);
	if (readsScript(argv) || name === "source" || name === "." || script === "") {
		return 2;
	}
	// `xargs -I{} sh -c '{}'` puts each line of its input into the script.
	const fed = script !== undefined && argv.some((w) => XARGS.has(baseName(w)));
	return fed || script?.includes("$") || first === "" || name.startsWith("$")
		? 1
		: 0;
};
