#!/usr/bin/env bun
// Usage: bun tools/jsdoc.ts [--count]

import { join } from "node:path";
import { file as bunFile, Glob } from "bun";
import { CHECKED_GLOBS, isTestFile } from "./file-lines.ts";

const DECLARATION =
	/^export\s+(?:declare\s+)?(?:abstract\s+)?(?:async\s+)?(const|let|var|function|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)/;

const BLOCK_END = /^\s*\*\/\s*$/;
const BLOCK_START = /^\s*\/\*\*/;
const BLOCK_BODY = /^\s*\*?\s?/;
const ONE_LINE = /^\s*\/\*\*(.*)\*\/\s*$/;

const EMPTY_WORDS = new Set([
	"a",
	"an",
	"and",
	"as",
	"at",
	"be",
	"by",
	"each",
	"for",
	"from",
	"in",
	"into",
	"is",
	"it",
	"its",
	"of",
	"on",
	"one",
	"or",
	"per",
	"that",
	"the",
	"their",
	"this",
	"to",
	"was",
	"which",
	"with",
]);

export interface Export {
	readonly file: string;
	readonly line: number;
	readonly kind: string;
	readonly name: string;
	readonly doc: string | null;
}

export interface Fault {
	readonly file: string;
	readonly line: number;
	readonly reason: string;
}

const CAMEL_SEAM = /([a-z0-9])([A-Z])/g;
const RUN_SEAM = /([A-Z]+)([A-Z][a-z])/g;
const NAME_BREAK = /[\s_$]+/;

export const wordsOfName = (name: string): Set<string> =>
	new Set(
		name
			.replace(CAMEL_SEAM, "$1 $2")
			.replace(RUN_SEAM, "$1 $2")
			.split(NAME_BREAK)
			.filter((word) => word.length > 0)
			.map((word) => word.toLowerCase()),
	);

const CODE_SPAN = /`[^`]*`/g;
const PROSE_BREAK = /[^a-z0-9]+/;

/** A backticked span is dropped: it names the declaration or a parameter, both on the next line. */
export const wordsOfDoc = (doc: string): string[] =>
	doc
		.split("\n")
		.map((line) => line.replace(BLOCK_BODY, ""))
		.join(" ")
		.replace(CODE_SPAN, " ")
		.toLowerCase()
		.split(PROSE_BREAK)
		.filter((word) => word.length > 0 && !EMPTY_WORDS.has(word));

/** Nothing is skipped on the way up, since a block split from its declaration documents neither. */
export const docAbove = (
	lines: readonly string[],
	at: number,
): string | null => {
	const above = lines[at - 1] ?? "";
	if (ONE_LINE.test(above)) {
		return above;
	}
	if (!BLOCK_END.test(above)) {
		return null;
	}
	for (let from = at - 2; from >= 0; from -= 1) {
		const line = lines[from] ?? "";
		if (BLOCK_START.test(line)) {
			return lines.slice(from, at).join("\n");
		}
		if (!line.trimStart().startsWith("*")) {
			return null;
		}
	}
	return null;
};

export const exportsOf = (file: string, text: string): Export[] => {
	const lines = text.split("\n");
	const found: Export[] = [];
	lines.forEach((line, at) => {
		const match = DECLARATION.exec(line);
		if (match !== null) {
			found.push({
				file,
				line: at + 1,
				kind: match[1] ?? "",
				name: match[2] ?? "",
				doc: docAbove(lines, at),
			});
		}
	});
	return found;
};

export const faultsOf = (one: Export): Fault[] => {
	if (one.doc === null) {
		return [];
	}
	const words = wordsOfDoc(one.doc);
	const inName = wordsOfName(one.name);
	if (words.length > 0 && words.every((word) => inName.has(word))) {
		return [
			{
				file: one.file,
				line: one.line,
				reason: `the JSDoc above ${one.name} uses only words of its own name, so it adds no fact`,
			},
		];
	}
	return [];
};

export const sourcesIn = async (
	root: string,
	globs: readonly string[] = CHECKED_GLOBS,
): Promise<string[]> => {
	const paths = new Set<string>();
	const scans = await Promise.all(
		globs.map(async (glob) => await Array.fromAsync(new Glob(glob).scan(root))),
	);
	for (const found of scans) {
		for (const path of found) {
			if (!isTestFile(path)) {
				paths.add(path);
			}
		}
	}
	return [...paths].sort((a, b) => a.localeCompare(b));
};

export const faultsIn = async (root: string): Promise<Fault[]> => {
	const files = await sourcesIn(root);
	const perFile = await Promise.all(
		files.map(async (file) =>
			exportsOf(file, await bunFile(join(root, file)).text()).flatMap(faultsOf),
		),
	);
	return perFile.flat();
};

export const countByFolder = (
	faults: readonly Fault[],
): Map<string, number> => {
	const counts = new Map<string, number>();
	for (const fault of faults) {
		const top = fault.file.split("/")[0] ?? "";
		counts.set(top, (counts.get(top) ?? 0) + 1);
	}
	return counts;
};

if (import.meta.main) {
	const faults = await faultsIn(join(import.meta.dir, ".."));
	if (process.argv.includes("--count")) {
		for (const [folder, count] of countByFolder(faults)) {
			console.error(`${folder}: ${count}`);
		}
		console.error(`total: ${faults.length}`);
	} else {
		for (const fault of faults) {
			console.error(`${fault.file}:${fault.line}: ${fault.reason}`);
		}
	}
	if (faults.length > 0) {
		process.exitCode = 1;
	}
}
