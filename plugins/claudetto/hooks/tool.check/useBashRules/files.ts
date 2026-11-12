import { GATE_WHOLE_FORMAT } from "../../texts-gate";
import { baseName } from "./program-at";
import type { Command } from "./shell-words";
import { deny, type Verdict } from "./verdict";

export const flagsOf = (args: string[]): string[] => {
	const end = args.indexOf("--");
	return args
		.slice(0, end === -1 ? args.length : end)
		.filter((a) => a.startsWith("-") && a !== "-")
		.flatMap((a) =>
			a.startsWith("--")
				? [a.split("=")[0] ?? a]
				: Array.from(a.slice(1), (c) => `-${c}`),
		);
};

export const operands = (args: string[]): string[] => {
	const end = args.indexOf("--");
	return [
		...args
			.slice(0, end === -1 ? args.length : end)
			.filter((a) => !a.startsWith("-")),
		...(end === -1 ? [] : args.slice(end + 1)),
	];
};

const SHELL_VALUES = new Set(["$!", "$$", "$?"]);

/** An `echo` of only `$!`, `$$`, or `$?`, which records a value, such as a launched command's pid, and no file content. */
const echoesValue = (name: string, args: string[]): boolean => {
	const words = operands(args);
	return (
		name === "echo" &&
		words.length > 0 &&
		words.every((w) => SHELL_VALUES.has(w))
	);
};

export const writesWhole = (
	name: string,
	args: string[],
	redirected: boolean,
): boolean =>
	(name === "tee" && !flagsOf(args).includes("-a")) ||
	(redirected &&
		!echoesValue(name, args) &&
		(name === "printf" ||
			name === "echo" ||
			(name === "cat" && operands(args).length === 0)));

/** Each in-place editor with `i` and its flag letters that take a value, so what follows such a letter is no flag. */
const IN_PLACE_EDITORS = new Map([
	["sed", /[ief]/u],
	["perl", /[ieEMmIFCDV]/u],
	["ruby", /[irIeEKFxCW]/u],
]);
const FIND_RUNS = new Set(["-exec", "-execdir", "-ok", "-okdir"]);

/** The program a command runs, and each program its `find -exec` runs. */
const programsOf = (name: string, args: string[]): string[][] => {
	if (name !== "find") {
		return [[name, ...args]];
	}
	const runs = args.flatMap((arg, i) => {
		if (!FIND_RUNS.has(arg)) {
			return [];
		}
		const rest = args.slice(i + 1);
		const end = rest.findIndex((a) => a === ";" || a === "+");
		return [rest.slice(0, end === -1 ? rest.length : end)];
	});
	return [[name, ...args], ...runs];
};

/** True when an editor reads `-i` or `--in-place` as its own flag: `sed` reads flags anywhere, and `perl` and `ruby` stop at the program file. */
const editsInPlace = (name: string, [arg, ...rest]: string[]): boolean => {
	const stops = IN_PLACE_EDITORS.get(name);
	if (stops === undefined || arg === undefined || arg === "--") {
		return false;
	}
	if (!arg.startsWith("-") || arg === "-") {
		return name === "sed" && editsInPlace(name, rest);
	}
	if (arg.startsWith("--")) {
		return arg.split("=")[0] === "--in-place" || editsInPlace(name, rest);
	}
	const stop = arg.search(stops);
	// A value letter that ends its word takes the next word as its value.
	const next = rest.slice(stop === arg.length - 1 ? 1 : 0);
	return arg[stop] === "i" || editsInPlace(name, next);
};

/** The file an in-place editor changes, or undefined when the command edits nothing in place. */
export const inPlaceTarget = (
	name: string,
	args: string[],
): string | undefined => {
	const edit = programsOf(name, args).find(([program = "", ...rest]) =>
		editsInPlace(baseName(program), rest),
	);
	return edit && (operands(edit.slice(1)).at(-1) ?? "");
};

const COUNT_FLAGS = new Set(["-n", "-c", "--lines", "--bytes"]);

/** Whether a word is a flag that holds a count or a `sed` script, and whether its value is the next word or joined to it, as in `-e1p` or `--expression=1p`. */
const valueOf = (name: string, word: string): "next" | "joined" | undefined => {
	if (name !== "sed") {
		return COUNT_FLAGS.has(word) ? "next" : undefined;
	}
	if (word === "--expression" || word === "--file") {
		return "next";
	}
	if (/^--(?:expression|file)=/u.test(word)) {
		return "joined";
	}
	const flags = /^-[a-zA-Z]*?[ef]/u.exec(word)?.[0];
	if (flags === undefined) {
		return undefined;
	}
	return flags === word ? "next" : "joined";
};

/** The files a `head`, `tail`, `sed`, or `cat` prints: the operands without a count or a script, which is not a file. */
export const printedFiles = (name: string, args: string[]): string[] => {
	const rest: string[] = [];
	let scripted = false;
	let skip = false;
	for (const word of args) {
		const held: "next" | "joined" | undefined = skip
			? undefined
			: valueOf(name, word);
		scripted ||= held !== undefined;
		if (!skip && held === undefined) {
			rest.push(word);
		}
		skip = !skip && held === "next";
	}
	const files = operands(rest);
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
	return (
		name === "sed" &&
		flagsOf(args).some(
			(f) => f === "-n" || f === "--quiet" || f === "--silent",
		) &&
		files.length > 0
	);
};

const HEAD_COUNT = /^(?:-n|--lines=|-)(\d+)$/u;

/** The first line and the number of lines that a `sed -n 5p`, `sed -n 10,20p`, or `head -n 5` of one file prints, or undefined when no range is fixed. */
export const printedRange = (
	name: string,
	args: string[],
): { offset: number; limit: number } | undefined => {
	if (printedFiles(name, args).length !== 1) {
		return undefined;
	}
	if (name === "sed") {
		const [, from, to] =
			/^(\d+)(?:,(\d+))?p$/u.exec(operands(args)[0] ?? "") ?? [];
		const offset = Number(from);
		const limit = Number(to ?? from) - offset + 1;
		return offset > 0 && limit > 0 ? { offset, limit } : undefined;
	}
	if (
		name !== "head" ||
		flagsOf(args).some((f) => f === "-c" || f === "--bytes")
	) {
		return undefined;
	}
	const spelled = args.flatMap((word, i) =>
		word === "-n" || word === "--lines"
			? [args[i + 1]]
			: [HEAD_COUNT.exec(word)?.[1]],
	);
	const limit = Number(spelled.find((s) => s !== undefined) ?? 10);
	return limit > 0 ? { offset: 1, limit } : undefined;
};

export const writeTargets = (
	c: Command,
	name: string,
	args: string[],
): string[] => {
	const files = operands(args);
	const written =
		name === "tee" || name === "rm"
			? files
			: files.slice(name === "cp" || name === "mv" ? -1 : files.length);
	return [
		...written,
		...c.redirects.filter((r) => r.op !== "<").map((r) => r.target),
	];
};

const PACKAGE_RUNNERS = new Set(["bunx", "npx", "pnpx"]);
const SCOPED = /^--(?:check|staged|changed|stdin-filepath)(?:=|$)|^-c$/u;
const WRITE = new Set(["--write", "-w"]);

const wholeRepo = (args: string[]): boolean => {
	const paths = args.filter((a) => !a.startsWith("-"));
	return paths.length === 0 || paths.some((p) => p === "." || p === "./");
};

/** Denies `bun fmt`, `prettier --write`, or `biome … --write` over the whole repository, which rewrites files outside the task. */
export const formatVerdict = (
	name: string,
	args: string[],
): Verdict | undefined => {
	const [tool, ...rest] = PACKAGE_RUNNERS.has(name) ? args : [name, ...args];
	const bunFmt =
		tool === "bun" &&
		rest[0] === "fmt" &&
		!rest.some((a) => SCOPED.test(a)) &&
		wholeRepo(rest.slice(1));
	const writes =
		(tool === "prettier" || tool === "biome") &&
		rest.some((a) => WRITE.has(a)) &&
		wholeRepo(tool === "biome" ? rest.slice(1) : rest);
	return bunFmt || writes ? deny(GATE_WHOLE_FORMAT) : undefined;
};
