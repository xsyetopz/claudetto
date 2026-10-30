#!/usr/bin/env bun
// Text reads best on the page the way it reads in the output. A newline escaped by hand, or assembled
// by a call over parts typed in place, hides the blank line and the indentation that a multiline
// template literal shows, which matters most for the prompt and message text this tree ships.
//
// Two shapes are faults.
//
//   - `[a, b].join("\n")` where the receiver is an array literal written in place: the author typed
//     every part, so one template literal can hold them all.
//   - A double-quoted literal with a `\n` between its first and its last character of text, as
//     `"# Handoff\n\n## Goal\n"`: the shape of the message is hidden in the escapes.
//
// Two shapes look like them and are right, so they are never reported.
//
//   - `join("\n")` over a built value. Only a receiver that ends in `]` can be reported, and not one
//     with a spread in it, because a spread is the loop, `.map(...)`, or `.filter(...)` that no
//     literal can hold. A variable and a call never end in `]`.
//   - An escaped `\n` as a separator or a needle: `split("\n")`, `indexOf("\n")`, `startsWith("---\n")`.
//
// The boundary of the second fault: a literal is a message when a `\n` lies between its first and its
// last character that is not a `\n`. A `\n` at either end, however many, is a terminator or a needle.
// Of 184 double-quoted literals in the tree that hold the text `\n`, 43 are messages, 99 are the whole
// literal `"\n"`, and 42 hold newlines at an end only (`"x\n"`, `"\n---"`), so 141 stay.
//
// Scope: the roots of `CHECKED_GLOBS`, which are `plugins/`, `claudekit/`, `tools/`, and `tests/`.
// `archive/` is gitignored and is the tree this one replaces. `dev/` does not exist and is not walked.
// The scan lexes, so a `\n` or a `.join` inside a comment, a template text, or a regex is never seen.
//
// Not seen, because a miss is cheaper than a report that gets suppressed: a `\n` in a single-quoted
// literal or a template text; parts pushed to a variable before `join("\n")`; and a conditional element
// in a literal array, which the check reports as in place.
//
//   bun tools/literals.ts

import { join } from "node:path";
import { file as bunFile, Glob } from "bun";
import { CHECKED_GLOBS } from "./file-lines.ts";

/** Which of the two shapes a fault is: a `join("\n")` over a literal array, or an escaped message. */
export type Shape = "join" | "message";

/** One site, by file relative to the root and the line it opens on. */
export interface Fault {
	readonly file: string;
	readonly line: number;
	readonly shape: Shape;
}

/** A double-quoted literal of a file: where its opening quote is, and the text between the quotes. */
interface Quoted {
	readonly at: number;
	readonly raw: string;
}

/** A source file after masking: code with comments and string text blanked, and its double-quoted literals. */
interface Masked {
	readonly code: string;
	readonly quoted: readonly Quoted[];
}

interface Scan {
	readonly source: string;
	readonly out: string[];
	readonly quoted: Quoted[];
}

/** Text that starts a regular expression when it ends the code before a `/`. */
const REGEX_AFTER = /[(,=:[!&|?{};]$|\breturn$/;

/** The word that ends a stretch of code, if any. */
const WORD_END = /[\w$]+$/;

/** Words that end in a word character and still let an array literal follow, as `return [`. */
const LEADS_VALUE = /^(?:return|await|yield|case|of|in|throw|typeof|void|new)$/;

const blank = (scan: Scan, from: number, to: number, fill: string): void => {
	for (let k = from; k < to; k++) {
		if (scan.source[k] !== "\n") {
			scan.out[k] = fill;
		}
	}
};

/** The index just past the closing quote of the `'` or `"` literal that opens at `at`. */
const quoteEnd = (source: string, at: number): number => {
	let k = at + 1;
	while (k < source.length && source[k] !== source[at]) {
		k += source[k] === "\\" ? 2 : 1;
	}
	return Math.min(k + 1, source.length);
};

/** A regular expression literal at the sticky position: escapes, classes, and no line break. */
const REGEX_BODY = /\/(?:\\.|\[(?:\\.|[^\]\\\n])*\]|[^/\\\n[])+\//y;

/** The index just past the regular expression that opens at `at`, or `at` when it is a division. */
const regexEnd = (source: string, at: number): number => {
	const before = source.slice(Math.max(0, at - 12), at).trimEnd();
	if (before !== "" && !REGEX_AFTER.test(before)) {
		return at;
	}
	REGEX_BODY.lastIndex = at;
	const hit = REGEX_BODY.exec(source);
	return hit === null ? at : at + hit[0].length;
};

/** The index just past the comment that opens at `at`. */
const commentEnd = (source: string, at: number): number => {
	const stop = source[at + 1] === "/" ? "\n" : "*/";
	const end = source.indexOf(stop, at + 2);
	return end === -1 ? source.length : end + (stop === "\n" ? 0 : 2);
};

/** The index just past the template literal that opens at `at`, with its `${}` code left visible. */
const templateEnd = (scan: Scan, at: number): number => {
	let k = at + 1;
	let from = at + 1;
	while (k < scan.source.length) {
		const step = scan.source.startsWith("${", k) ? "code" : scan.source[k];
		if (step === "`") {
			blank(scan, from, k, "~");
			return k + 1;
		}
		if (step === "code") {
			blank(scan, from, k + 2, "~");
			from = scanCode(scan, k + 2, true);
			k = from + 1;
		} else {
			k += step === "\\" ? 2 : 1;
		}
	}
	return k;
};

/** The index just past the token that opens at `at`, with the text of a comment or a literal blanked. */
const tokenEnd = (scan: Scan, at: number): number => {
	const { source } = scan;
	const ch = source[at];
	const next = source[at + 1];
	if (ch === "/" && (next === "/" || next === "*")) {
		const end = commentEnd(source, at);
		blank(scan, at, end, " ");
		return end;
	}
	if (ch === '"' || ch === "'") {
		const end = quoteEnd(source, at);
		if (ch === '"') {
			scan.quoted.push({ at, raw: source.slice(at + 1, end - 1) });
		}
		blank(scan, at + 1, end - 1, "_");
		return end;
	}
	if (ch === "`") {
		return templateEnd(scan, at);
	}
	const end = ch === "/" ? regexEnd(source, at) : at;
	blank(scan, at + 1, end - 1, "_");
	return Math.max(end, at + 1);
};

/** Scans code from `from`; inside a `${}` it stops at the `}` that closes it and returns that index. */
const scanCode = (scan: Scan, from: number, nested: boolean): number => {
	let depth = 0;
	let at = from;
	while (at < scan.source.length) {
		const ch = scan.source[at];
		if (nested && ch === "}" && depth === 0) {
			return at;
		}
		depth += nested ? Number(ch === "{") - Number(ch === "}") : 0;
		at = tokenEnd(scan, at);
	}
	return at;
};

/** A file with its comments, string text, template text, and regex bodies blanked, same length. */
export const mask = (source: string): Masked => {
	const scan: Scan = { source, out: source.split(""), quoted: [] };
	scanCode(scan, 0, false);
	return { code: scan.out.join(""), quoted: scan.quoted };
};

/** Whether a double-quoted literal holds a `\n` between its first and its last character of text. */
export const hidesShape = (raw: string): boolean => {
	const tokens = raw.match(/\\[\s\S]|[^\\]/g) ?? [];
	const isNewline = (token: string): boolean => token === "\\n";
	const text = tokens.flatMap((token, i) => (isNewline(token) ? [] : [i]));
	const [first, last] = [text.at(0), text.at(-1)];
	return (
		first !== undefined &&
		last !== undefined &&
		tokens.slice(first, last + 1).some(isNewline)
	);
};

/** The index of the `[` that closes the `]` at `close`, or -1. */
const openerOf = (code: string, close: number): number => {
	let depth = 0;
	for (let k = close; k >= 0; k--) {
		depth += Number(code[k] === "]") - Number(code[k] === "[");
		if (depth === 0) {
			return k;
		}
	}
	return -1;
};

/** Whether the `[` at `open` starts an array literal, and not an index into a value. */
const startsLiteral = (code: string, open: number): boolean => {
	const before = code.slice(0, open).trimEnd();
	const word = WORD_END.exec(before)?.[0];
	return word === undefined
		? !before.endsWith(")") && !before.endsWith("]")
		: LEADS_VALUE.test(word);
};

/** Whether a top-level element of the array between `open` and `close` is a spread. */
const spreads = (code: string, open: number, close: number): boolean => {
	let depth = 0;
	for (let k = open + 1; k < close; k++) {
		depth +=
			Number("([{".includes(code[k] ?? "")) -
			Number(")]}".includes(code[k] ?? ""));
		if (depth === 0 && code.startsWith("...", k)) {
			return true;
		}
	}
	return false;
};

/** Every `].join("\n")` of `masked` whose receiver is an array literal with no spread, by `[` index. */
const joinOpeners = (masked: Masked): number[] =>
	[...masked.code.matchAll(/\]\s*\.join\(\s*"__"\s*\)/g)].flatMap((hit) => {
		const quote = hit.index + hit[0].indexOf('"');
		const open = openerOf(masked.code, hit.index);
		const isNewline = masked.quoted.some(
			(q) => q.at === quote && q.raw === "\\n",
		);
		return isNewline &&
			open >= 0 &&
			startsLiteral(masked.code, open) &&
			!spreads(masked.code, open, hit.index)
			? [open]
			: [];
	});

/** The faults of one file's text, in line order. */
export const faultsIn = (file: string, source: string): Fault[] => {
	const masked = mask(source);
	const lineOf = (at: number): number => source.slice(0, at).split("\n").length;
	return [
		...joinOpeners(masked).map((at) => ({
			file,
			line: lineOf(at),
			shape: "join" as const,
		})),
		...masked.quoted
			.filter((q) => hidesShape(q.raw))
			.map((q) => ({ file, line: lineOf(q.at), shape: "message" as const })),
	].sort((a, b) => a.line - b.line);
};

/** The faults under `root`, read through `globs`, in path then line order. */
export const literalFaults = async (
	root: string,
	globs: string[] = CHECKED_GLOBS,
): Promise<Fault[]> => {
	const scans = await Promise.all(
		globs.map((glob) => Array.fromAsync(new Glob(glob).scan(root))),
	);
	const files = [...new Set(scans.flat())]
		.filter((path) => !path.includes("node_modules"))
		.sort((a, b) => a.localeCompare(b));
	const faults = await Promise.all(
		files.map(async (path) =>
			faultsIn(path, await bunFile(join(root, path)).text()),
		),
	);
	return faults.flat();
};

/** One line per fault, in the `file:line: reason` form that an editor jumps to. */
export const faultLine = ({ file, line, shape }: Fault): string =>
	shape === "join"
		? `${file}:${line}: join("\\n") over an array literal written in place, so write the parts as one multiline template literal`
		: `${file}:${line}: a double-quoted literal holds a \\n between its text, so write it as a multiline template literal`;

if (import.meta.main) {
	const lines = (await literalFaults(join(import.meta.dir, ".."))).map(
		faultLine,
	);
	for (const line of lines) {
		console.error(line);
	}
	if (lines.length > 0) {
		process.exitCode = 1;
	}
}
