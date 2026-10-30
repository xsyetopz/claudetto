#!/usr/bin/env bun

import { join } from "node:path";
import { file as bunFile, Glob } from "bun";
import { MAX_SOURCE_LINES, MAX_TEST_LINES } from "./limits.ts";

export const CHECKED_GLOBS = [
	"plugins/**/*.ts",
	"plugins/**/*.tsx",
	"claudekit/**/*.ts",
	"tools/**/*.ts",
	"tests/**/*.ts",
];

export interface LongFile {
	file: string;
	lines: number;
	limit: number;
}

const IN_TESTS = /(^|\/)(?:tests|__tests__)\//;

const NAMED_TEST = /\.(?:test|spec)\.tsx?$/;

export const isTestFile = (path: string): boolean =>
	IN_TESTS.test(path) || NAMED_TEST.test(path);

/** A test holds cases a source does not, hence 500 lines for a test and 300 for a source. */
export const limitOf = (path: string): number =>
	isTestFile(path) ? MAX_TEST_LINES : MAX_SOURCE_LINES;

export const lineCount = (text: string): number => {
	const parts = text.split("\n");
	return parts.at(-1) === "" ? parts.length - 1 : parts.length;
};

export const longFiles = (
	files: { file: string; lines: number }[],
): LongFile[] =>
	files
		.map(({ file, lines }) => ({ file, lines, limit: limitOf(file) }))
		.filter(({ lines, limit }) => lines > limit);

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
