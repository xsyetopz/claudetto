#!/usr/bin/env bun
// Usage: `bun tools/no-narration.ts`. It reads every checked `.ts` file, prints one `file:line: reason: text`
// per fault, and exits 1 when there is any. A comment says why and never what produced the code, because
// the name of a task or of a session points at the process and leaves the reason out.
//
// It refuses two shapes and no more. A third shape, the words of the port from the old tree, was deleted
// on 2026-10-30 together with the seven-entry allowlist it needed: run over the whole tree with the
// allowlist off, the two shapes below matched no line at all and the port shape matched three, every one
// of them in `plugins/claudetto/src/deny.ts`, where `archived` names the archived deny list that the
// module's own rows are about. A shape that matches only its own exceptions cannot tell the process from
// the subject matter, and no check reads that difference from words.

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
 * Neither word can appear in a dated reading, which cites a date and a command, so neither shape needs
 * an exception and the tool carries no allowlist.
 */
const SHAPES: { pattern: RegExp; reason: string }[] = [
	{
		pattern: /\b(?:task|group)\s+\d+(?:\.\d+)?\b/i,
		reason: "names a task or a group by number",
	},
	{
		pattern:
			/\bin this session\b|\bthe user (?:confirmed|chose|decided|declined)\b/i,
		reason: "points at a session",
	},
];

/** A line with a `//` comment or a block comment body. */
const COMMENT = /(?:^|\s)\/\/|^\s*\/?\*/;

/** A line that opens a test or a suite with a quoted name. */
const TEST_NAME = /\b(?:test|it|describe)(?:\.\w+)?\(\s*["'`]/;

/** The faults of `text`, the content of `file`: a comment or a test name that narrates the process. */
export const narrations = (file: string, text: string): Narration[] =>
	text.split("\n").flatMap((raw, i) => {
		const line = i + 1;
		if (!(COMMENT.test(raw) || TEST_NAME.test(raw))) {
			return [];
		}
		return SHAPES.filter(({ pattern }) => pattern.test(raw)).map(
			({ reason }) => ({ file, line, reason, text: raw.trim() }),
		);
	});

/** The faults of the checked files under `root`. */
export const narrationsIn = async (
	root: string,
	globs: string[] = CHECKED_GLOBS,
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
