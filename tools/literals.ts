#!/usr/bin/env bun
// A `\n` at either end of a literal is a terminator or a needle, not a message.
// Not seen: a `\n` in single-quoted or template text, since a miss costs less than a suppressed report.
// Usage: bun tools/literals.ts

import { join } from "node:path";
import { file as bunFile, Glob } from "bun";
import { CHECKED_GLOBS } from "./file-lines.ts";

export type Shape = "join" | "message";

export interface Fault {
	readonly file: string;
	readonly line: number;
	readonly shape: Shape;
}

interface Quoted {
	readonly at: number;
	readonly raw: string;
}

interface Masked {
	readonly code: string;
	readonly quoted: readonly Quoted[];
}

interface Scan {
	readonly source: string;
	readonly out: string[];
	readonly quoted: Quoted[];
}

const REGEX_AFTER = /[(,=:[!&|?{};]$|\breturn$/;

const WORD_END = /[\w$]+$/;

const LEADS_VALUE = /^(?:return|await|yield|case|of|in|throw|typeof|void|new)$/;

const blank = (scan: Scan, from: number, to: number, fill: string): void => {
	for (let k = from; k < to; k++) {
		if (scan.source[k] !== "\n") {
			scan.out[k] = fill;
		}
	}
};

const quoteEnd = (source: string, at: number): number => {
	let k = at + 1;
	while (k < source.length && source[k] !== source[at]) {
		k += source[k] === "\\" ? 2 : 1;
	}
	return Math.min(k + 1, source.length);
};

const REGEX_BODY = /\/(?:\\.|\[(?:\\.|[^\]\\\n])*\]|[^/\\\n[])+\//y;

const regexEnd = (source: string, at: number): number => {
	const before = source.slice(Math.max(0, at - 12), at).trimEnd();
	if (before !== "" && !REGEX_AFTER.test(before)) {
		return at;
	}
	REGEX_BODY.lastIndex = at;
	const hit = REGEX_BODY.exec(source);
	return hit === null ? at : at + hit[0].length;
};

const commentEnd = (source: string, at: number): number => {
	const stop = source[at + 1] === "/" ? "\n" : "*/";
	const end = source.indexOf(stop, at + 2);
	return end === -1 ? source.length : end + (stop === "\n" ? 0 : 2);
};

const templateEnd = (scan: Scan, at: number): number => {
	let k = at + 1;
	let from = at + 1;
	while (k < scan.source.length) {
		const step = scan.source.startsWith("${", k) ? "code" : scan.source[k];
		switch (step) {
			case "`":
				blank(scan, from, k, "~");
				return k + 1;
			case "code":
				blank(scan, from, k + 2, "~");
				from = scanCode(scan, k + 2, true);
				k = from + 1;
				break;
			default:
				k += step === "\\" ? 2 : 1;
		}
	}
	return k;
};

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

export const mask = (source: string): Masked => {
	const scan: Scan = { source, out: source.split(""), quoted: [] };
	scanCode(scan, 0, false);
	return { code: scan.out.join(""), quoted: scan.quoted };
};

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

const startsLiteral = (code: string, open: number): boolean => {
	const before = code.slice(0, open).trimEnd();
	const word = WORD_END.exec(before)?.[0];
	return word === undefined
		? !before.endsWith(")") && !before.endsWith("]")
		: LEADS_VALUE.test(word);
};

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
