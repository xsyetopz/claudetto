// The cases plant files of a known length under a
// temporary root, so the rule is checked by what it reports and not by the files this repository
// happens to hold. The last case is the gate itself over the new tree.

import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { lineCount, longFilesIn } from "../../tools/file-lines.ts";
import { MAX_SOURCE_LINES, MAX_TEST_LINES } from "../../tools/limits.ts";

/** A file of `lines` lines, each one a comment, ending with a newline. */
const body = (lines: number): string =>
	`${Array.from({ length: lines }, (_, i) => `// line ${i + 1}`).join("\n")}\n`;

/** A temporary root holding each `[path, lines]` pair as a file of that many lines. */
const rootWith = async (files: [string, number][]): Promise<string> => {
	const root = await mkdtemp(join(tmpdir(), "file-lines-"));
	const dirs = new Set(files.map(([path]) => join(root, path, "..")));
	await Promise.all([...dirs].map((dir) => mkdir(dir, { recursive: true })));
	await Promise.all(
		files.map(([path, lines]) => writeFile(join(root, path), body(lines))),
	);
	return root;
};

describe("the line count", () => {
	test("counts a file that ends with a newline the way `wc -l` counts it", () => {
		expect(
			lineCount(`a
b
`),
		).toBe(2);
	});

	test("counts a last line that has no newline", () => {
		expect(
			lineCount(`a
b`),
		).toBe(2);
	});

	test("counts an empty file as no lines", () => {
		expect(lineCount("")).toBe(0);
	});
});

describe("the file-length rule", () => {
	test("a planted over-long source file is named with its count and limit", async () => {
		const root = await rootWith([
			["tools/long.ts", MAX_SOURCE_LINES + 1],
			["tools/short.ts", MAX_SOURCE_LINES],
		]);

		const found = await longFilesIn(root);

		expect(found).toEqual([
			{
				file: "tools/long.ts",
				lines: MAX_SOURCE_LINES + 1,
				limit: MAX_SOURCE_LINES,
			},
		]);
	});

	test("a test file gets the larger limit", async () => {
		const root = await rootWith([
			["tests/repo/long.test.ts", MAX_TEST_LINES + 1],
			["tests/repo/short.test.ts", MAX_TEST_LINES],
		]);

		const found = await longFilesIn(root);

		expect(found).toEqual([
			{
				file: "tests/repo/long.test.ts",
				lines: MAX_TEST_LINES + 1,
				limit: MAX_TEST_LINES,
			},
		]);
	});

	test("a source file of the test length is still over its own limit", async () => {
		const root = await rootWith([
			["plugins/claudetto/src/big.ts", MAX_TEST_LINES],
		]);

		const found = await longFilesIn(root);

		expect(found.map(({ file }) => file)).toEqual([
			"plugins/claudetto/src/big.ts",
		]);
	});

	test("every file of this repository is inside its limit", async () => {
		const found = await longFilesIn(join(import.meta.dir, "..", ".."));

		expect(found).toEqual([]);
	});
});
