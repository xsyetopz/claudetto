import { describe, expect, test } from "bun:test";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const DOCS = "docs";

const VERDICT = /verdict of/i;

const NO_WINNER = /no winner/i;

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
			join("plugins", "claudetto", "src", "blocks", "compaction", "block.ts"),
			"utf8",
		);

		expect(accepted).toEqual([]);
		expect(hook).toContain("next(e)");
	});
});
