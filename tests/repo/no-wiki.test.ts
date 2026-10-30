import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { file as bunFile, Glob } from "bun";

const ROOT = join(import.meta.dir, "..", "..");

const CODE_GLOBS = [
	"plugins/**/*.ts",
	"plugins/**/*.tsx",
	"plugins/**/*.json",
	"claudekit/**/*.ts",
	"tools/**/*.ts",
	"tests/**/*.ts",
	".github/workflows/*.yml",
];

const WIKI = /wiki/i;

const GENERATE = /\bgenerate\b/i;

/** Skipped: this file names the word to forbid it, and the generated Gitleaks rules carry it as a stopword. */
const SKIPPED = new Set([
	"tests/repo/no-wiki.test.ts",
	"plugins/claudetto/src/shared/secrets/gitleaks/rules.ts",
]);

const pathsOf = async (globs: string[]): Promise<string[]> => {
	const scans = await Promise.all(
		globs.map(async (glob) => {
			const found: string[] = [];
			for await (const path of new Glob(glob).scan(ROOT)) {
				found.push(path);
			}
			return found;
		}),
	);
	return [...new Set(scans.flat())]
		.filter((path) => !SKIPPED.has(path))
		.sort((a, b) => a.localeCompare(b));
};

const wikiLines = async (paths: string[]): Promise<string[]> => {
	const hits = await Promise.all(
		paths.map(async (path) => {
			const text = await bunFile(join(ROOT, path)).text();
			return text
				.split("\n")
				.flatMap((line, i) => (WIKI.test(line) ? [`${path}:${i + 1}`] : []));
		}),
	);
	return hits.flat();
};

describe("the new tree holds no wiki", () => {
	test("no code file and no workflow names a wiki", async () => {
		const paths = await pathsOf(CODE_GLOBS);

		const hits = await wikiLines(paths);

		expect(paths.length).toBeGreaterThan(0);
		expect(hits).toEqual([]);
	});

	test("the recipes name no wiki step and no generated-page step", async () => {
		const text = await bunFile(join(ROOT, "justfile")).text();

		const hits = text
			.split("\n")
			.flatMap((line, i) =>
				WIKI.test(line) || GENERATE.test(line) ? [`justfile:${i + 1}`] : [],
			);

		expect(hits).toEqual([]);
	});
});
