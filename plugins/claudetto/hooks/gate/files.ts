import { GATE_WHOLE_FORMAT } from "../texts-gate.ts";
import { baseName } from "./program-at.ts";
import type { Command } from "./shell-words.ts";
import { deny, type Verdict } from "./verdict.ts";

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

export const writesWhole = (
	name: string,
	args: string[],
	redirected: boolean,
): boolean =>
	(name === "tee" && !flagsOf(args).includes("-a")) ||
	(redirected &&
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

const VALUED: Record<string, string[]> = {
	head: ["-n", "-c", "--lines", "--bytes"],
	tail: ["-n", "-c", "--lines", "--bytes"],
	sed: ["-e", "-f", "--expression", "--file"],
};

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
