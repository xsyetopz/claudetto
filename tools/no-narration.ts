#!/usr/bin/env bun
// Usage: `bun tools/no-narration.ts`. It reads every checked `.ts` file and Markdown doc, prints one `file:line: reason: text`
// per fault, and exits 1 when there is any. A comment says why and never what produced the code, because
// the name of a task, a decision, a plan, or a session points at the process and leaves the reason out,
// and the source is public while the plans are not shipped.

import { join } from "node:path";
import { file as bunFile, Glob } from "bun";
import { CHECKED_GLOBS } from "./file-lines.ts";

/** A comment line that names the process, with its file, its line number, the reason it is refused, and the trimmed line itself. */
export interface Narration {
	file: string;
	line: number;
	reason: string;
	text: string;
}

/**
 * The shapes that point at the process that produced the code, each with the reason it is refused.
 * No shape can appear in a dated reading, which cites a date and a command, so no shape needs an
 * exception and the tool carries no allowlist.
 */
const SHAPES: { pattern: RegExp; reason: string }[] = [
	{
		pattern: /\b(?:task|group)\s+\d+(?:\.\d+)?\b/i,
		reason: "names a task or a group by number",
	},
	{
		pattern: /\bD\d{1,3}\b(?! [0-9A-F]{2}\b|\()/,
		reason: "names a decision by ID",
	},
	{
		pattern: /\bopenspec\/(?:changes|specs)\//,
		reason: "points into a plan",
	},
	{
		pattern:
			/\bin this session\b|\bthe user (?:confirmed|chose|decided|declined)\b/i,
		reason: "points at a session",
	},
];

/**
 * The shapes for a doc, where a count of tasks and a quoted session phrase are prose: a task is named
 * by a dotted number or as a task group.
 */
const DOC_SHAPES = [
	{
		pattern: /\btask\s+\d+\.\d+|\btask group\s+\d+\b/i,
		reason: "names a task or a group by number",
	},
	...SHAPES.slice(1, 3),
];

/** A line with a `//` comment or a block comment body. */
const COMMENT = /(?:^|\s)\/\/|^\s*\/?\*/;

/** A line that opens a test or a suite with a quoted name. */
const TEST_NAME = /\b(?:test|it|describe)(?:\.\w+)?\(\s*["'`]/;

/** The docs that ship with the source, where every line is prose. */
export const CHECKED_DOC_GLOBS = ["docs/**/*.md", "README.md", "CHANGELOG.md"];

/** The faults of `text`, the content of `file`: a doc line, a comment, or a test name that narrates the process. */
export const narrations = (file: string, text: string): Narration[] =>
	text.split("\n").flatMap((raw, i) => {
		const line = i + 1;
		const prose = file.endsWith(".md");
		if (!(prose || COMMENT.test(raw) || TEST_NAME.test(raw))) {
			return [];
		}
		return (prose ? DOC_SHAPES : SHAPES)
			.filter(({ pattern }) => pattern.test(raw))
			.map(({ reason }) => ({ file, line, reason, text: raw.trim() }));
	});

/** The faults of the checked files under `root`. */
export const narrationsIn = async (
	root: string,
	globs: string[] = [...CHECKED_GLOBS, ...CHECKED_DOC_GLOBS],
): Promise<Narration[]> => {
	const paths = new Set<string>();
	for (const glob of globs) {
		for (const path of new Glob(glob).scanSync(root)) {
			paths.add(path);
		}
	}
	const found = await Promise.all(
		[...paths]
			.sort((a, b) => a.localeCompare(b))
			.map(async (path) =>
				narrations(path, await bunFile(join(root, path)).text()),
			),
	);
	return found.flat();
};

/** One line per fault, in the `file:line: reason` form that an editor jumps to. */
export const narrationLines = (faults: Narration[]): string[] =>
	faults.map(
		({ file, line, reason, text }) => `${file}:${line}: ${reason}: ${text}`,
	);

if (import.meta.main) {
	const lines = narrationLines(await narrationsIn(join(import.meta.dir, "..")));
	for (const line of lines) {
		console.error(line);
	}
	if (lines.length > 0) {
		process.exitCode = 1;
	}
}
