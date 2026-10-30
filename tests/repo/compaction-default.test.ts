// The gate of the requirement "Default Path" of the spec `compaction-path`: the compaction of Claude
// Code is the one path that ships, and it keeps that place while no probe result under `docs/` is
// accepted. Each round of the paid probe writes its verdict as one line, so an accepted result is a
// line of that shape that no longer says "No winner", and this test fails when one appears.
//
// There is no option to check any more. `compaction` offered `auto`, `built-in`, and `code` in the
// plugin dialog while the `pathOf` that read it was imported by nothing but its own spec file, so the
// person could set a value and nothing happened; the option and that module are deleted. A failing
// verdict line here is the signal to build the code path and offer the option again.

import { describe, expect, test } from "bun:test";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

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

	test("so no code path is offered, and `session.compact` defers to the engine", async () => {
		const lines = await verdictLines();
		const accepted = lines.filter((line) => !NO_WINNER.test(line));
		const hook = await readFile(
			join("plugins", "claudetto", "src", "compaction", "hook.ts"),
			"utf8",
		);

		expect(accepted).toEqual([]);
		expect(hook).toContain("next(e)");
	});
});
