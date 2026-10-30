#!/usr/bin/env bun
// A longer file is split along its concerns, because a reader, a person or a model, holds a short
// file of one concern in full.

import { join } from "node:path";
import { file as bunFile, Glob } from "bun";
import { MAX_SOURCE_LINES, MAX_TEST_LINES } from "./limits.ts";

/** The folders of the new tree that hold checked code. Nothing under `archive/` is checked. */
export const CHECKED_GLOBS = [
	"plugins/**/*.ts",
	"plugins/**/*.tsx",
	"claudekit/**/*.ts",
	"tools/**/*.ts",
	"tests/**/*.ts",
];

/** A file that holds more lines than its limit, with its line count and the limit it broke. */
export interface LongFile {
	file: string;
	lines: number;
	limit: number;
}

/** A path under a `tests/` folder, or inside a `__tests__/` folder beside the source it covers. */
const IN_TESTS = /(^|\/)(?:tests|__tests__)\//;

/** A file named `*.test.ts`, `*.test.tsx`, `*.spec.ts`, or `*.spec.tsx`. */
const NAMED_TEST = /\.(?:test|spec)\.tsx?$/;

/** Whether `path` is a test file, which gets the larger limit: a `.test.ts` or `.spec.ts` file or a file under a `tests/` or `__tests__/` folder. */
export const isTestFile = (path: string): boolean =>
	IN_TESTS.test(path) || NAMED_TEST.test(path);

/** 500 lines for a test file and 300 for a source, because a test holds cases a source does not. */
export const limitOf = (path: string): number =>
	isTestFile(path) ? MAX_TEST_LINES : MAX_SOURCE_LINES;

/** The lines of `text`, counted the way `wc -l` counts a file that ends with a newline. */
export const lineCount = (text: string): number => {
	const parts = text.split("\n");
	return parts.at(-1) === "" ? parts.length - 1 : parts.length;
};

/** The files of `files` that hold more lines than their limit. */
export const longFiles = (
	files: { file: string; lines: number }[],
): LongFile[] =>
	files
		.map(({ file, lines }) => ({ file, lines, limit: limitOf(file) }))
		.filter(({ lines, limit }) => lines > limit);

/** The over-long files under `root`, read through `globs`. */
export const longFilesIn = async (
	root: string,
	globs: string[] = CHECKED_GLOBS,
): Promise<LongFile[]> => {
	const paths = new Set<string>();
	const scans = await Promise.all(
		globs.map(async (glob) => {
			const found: string[] = [];
			for await (const path of new Glob(glob).scan(root)) {
				found.push(path);
			}
			return found;
		}),
	);
	for (const found of scans) {
		for (const path of found) {
			paths.add(path);
		}
	}
	const files = await Promise.all(
		[...paths]
			.sort((a, b) => a.localeCompare(b))
			.map(async (path) => ({
				file: path,
				lines: lineCount(await bunFile(join(root, path)).text()),
			})),
	);
	return longFiles(files);
};

/** One line per over-long file, in the `file:line: reason` form that an editor jumps to. */
export const longFileLines = (files: LongFile[]): string[] =>
	files.map(
		({ file, lines, limit }) =>
			`${file}:${limit + 1}: holds ${lines} lines, and the limit is ${limit}`,
	);

if (import.meta.main) {
	const lines = longFileLines(await longFilesIn(join(import.meta.dir, "..")));
	for (const line of lines) {
		console.error(line);
	}
	if (lines.length > 0) {
		process.exitCode = 1;
	}
}
