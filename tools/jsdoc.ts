#!/usr/bin/env bun
// The comment rule, held by a command instead of by review. It has two halves, and both read the code
// rather than judging the writing.
//
// First, every exported declaration of a shipped source carries a JSDoc block directly above it. An
// export is the surface another module calls, so a reader meets it without the file around it, and a
// name alone does not say what a caller may pass or what it gets back.
//
// Second, a JSDoc block whose words are all already in the name below it says nothing the name did not.
// `/** The window row. */` above `WindowRow` costs a line and a read and adds no fact. The test is a
// set comparison against the identifier and never a judgement of the prose, and it is deliberately
// conservative: a block is refused only when every content word of it appears in the name. One word
// the name does not hold is enough to pass, because the cost of a false refusal here is a session
// rewording a true comment, which is the fault that `tools/no-narration.ts` shows.
//
//   bun tools/jsdoc.ts
//   bun tools/jsdoc.ts --count        a count per folder instead of one line per fault

import { join } from "node:path";
import { file as bunFile, Glob } from "bun";
import { CHECKED_GLOBS, isTestFile } from "./file-lines.ts";

/** An exported declaration, which is the surface the rule is about. A re-export declares nothing. */
const DECLARATION =
	/^export\s+(?:declare\s+)?(?:abstract\s+)?(?:async\s+)?(const|let|var|function|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)/;

/** The close and open of a JSDoc block, which is the only comment form the first half accepts. */
const BLOCK_END = /^\s*\*\/\s*$/;
const BLOCK_START = /^\s*\/\*\*/;
const BLOCK_BODY = /^\s*\*?\s?/;
const ONE_LINE = /^\s*\/\*\*(.*)\*\/\s*$/;

/** Words that carry no fact, so a block made only of these and the name's own words restates it. */
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

/** One exported declaration, with whatever sits directly above it, which is what the rule judges. */
export interface Export {
	readonly file: string;
	readonly line: number;
	readonly kind: string;
	readonly name: string;
	/** The JSDoc block directly above, or null when there is none. */
	readonly doc: string | null;
}

/** One broken rule, in the `file:line: reason` form an editor jumps to. */
export interface Fault {
	readonly file: string;
	readonly line: number;
	readonly reason: string;
}

/** The seam inside `rowsOf`, and the one inside `HTTPServer`, where a word ends and the next begins. */
const CAMEL_SEAM = /([a-z0-9])([A-Z])/g;
const RUN_SEAM = /([A-Z]+)([A-Z][a-z])/g;
const NAME_BREAK = /[\s_$]+/;

/** The words of an identifier, splitting camel case, `_`, and `$`, lowercased. */
export const wordsOfName = (name: string): Set<string> =>
	new Set(
		name
			.replace(CAMEL_SEAM, "$1 $2")
			.replace(RUN_SEAM, "$1 $2")
			.split(NAME_BREAK)
			.filter((word) => word.length > 0)
			.map((word) => word.toLowerCase()),
	);

/** A backticked span, and anything that is not a word character of the prose. */
const CODE_SPAN = /`[^`]*`/g;
const PROSE_BREAK = /[^a-z0-9]+/;

/**
 * The content words of a doc block: its prose, less punctuation and the words that carry no fact. A
 * backticked span is dropped with them, because a code item a block names is almost always the
 * declaration's own name or one of its parameters, and both are already on the line below.
 */
export const wordsOfDoc = (doc: string): string[] =>
	doc
		.split("\n")
		.map((line) => line.replace(BLOCK_BODY, ""))
		.join(" ")
		.replace(CODE_SPAN, " ")
		.toLowerCase()
		.split(PROSE_BREAK)
		.filter((word) => word.length > 0 && !EMPTY_WORDS.has(word));

/**
 * The JSDoc block that ends on the line above `at`, or null when the line above is not a block close.
 * Nothing is skipped on the way up, because a block separated from its declaration by a blank line or
 * by another statement documents neither one clearly.
 */
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

/** Every exported declaration of one file, with the doc block above each. */
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

/** The faults of one export: no block above it, or a block that only says its name again. */
export const faultsOf = (one: Export): Fault[] => {
	if (one.doc === null) {
		return [
			{
				file: one.file,
				line: one.line,
				reason: `exported ${one.kind} ${one.name} has no JSDoc block directly above it`,
			},
		];
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

/** The shipped sources the rule covers: the checked globs, less every test file. */
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

/** Every fault under `root`, in path order. */
export const faultsIn = async (root: string): Promise<Fault[]> => {
	const files = await sourcesIn(root);
	const perFile = await Promise.all(
		files.map(async (file) =>
			exportsOf(file, await bunFile(join(root, file)).text()).flatMap(faultsOf),
		),
	);
	return perFile.flat();
};

/** A count per top folder, which is how the remaining work of this group is reported. */
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
