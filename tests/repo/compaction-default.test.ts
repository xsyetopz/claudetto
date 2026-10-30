// The gate of the requirement "Default Path" of the spec `compaction-path`: while no probe result
// under `docs/` is accepted, the shipped path is the built-in one. Each round of the paid probe
// writes its verdict as one line naming `bar.ts`, so an accepted result is a line of that shape
// that no longer says "No winner", and this test fails until the code default follows it.

import { describe, expect, test } from "bun:test";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import {
	AUTO,
	BUILT_IN,
	COMPACTION_OPTION,
	pathOf,
} from "../../plugins/claudetto/src/compaction/compaction.ts";

const DOCS = "docs";

/** A line that reports the verdict of a probe round. */
const VERDICT = /verdict of/i;

/** The verdict that leaves the default alone. */
const NO_WINNER = /no winner/i;

/** Each line of a Markdown file under `docs/` that reports a verdict, with its path in `docs/`. */
const verdictLines = async (): Promise<string[]> => {
	const names = (await readdir(DOCS, { recursive: true })).filter((name) =>
		name.endsWith(".md"),
	);
	const files = await Promise.all(
		names.map(async (name) => ({
			name,
			text: await readFile(join(DOCS, name), "utf8"),
		})),
	);
	return files.flatMap(({ name, text }) =>
		text
			.split("\n")
			.filter((line) => VERDICT.test(line))
			.map((line) => `${name}: ${line.trim()}`),
	);
};

describe("the compaction default against the accepted results", () => {
	test("every probe verdict written down says No winner", async () => {
		const lines = await verdictLines();

		expect(lines.length).toBeGreaterThan(0);
		expect(lines.filter((line) => !NO_WINNER.test(line))).toEqual([]);
	});

	test("so the shipped option resolves to the built-in path", async () => {
		const lines = await verdictLines();
		const accepted = lines.filter((line) => !NO_WINNER.test(line));

		expect(accepted).toEqual([]);
		expect(pathOf({ [COMPACTION_OPTION]: AUTO })).toBe(BUILT_IN);
	});
});
