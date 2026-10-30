import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { file as bunFile, Glob } from "bun";
import { MIN_CLAUDE_CODE_VERSION } from "../../tools/limits.ts";

const ROOT = join(import.meta.dir, "..", "..");

/** A `bun <file>` command: `bun run`, `add`, `install`, `check`, `test`, and `bunx` name no file. */
const BUN_FILE =
	/\bbun\s+(?!run\b|add\b|install\b|check\b|test\b|-)([^\s"']+)/g;

const INSTALLED = /@anthropic-ai\/claude-code@([\d.]+)/g;

const USES = /uses:\s*(\S+)/g;

/** A reference pinned to a commit, which is 40 hexadecimal digits. */
const PINNED = /@[\da-f]{40}$/;

const filesRun = (text: string): string[] =>
	[...text.matchAll(BUN_FILE)]
		.map((match) => match[1] ?? "")
		.filter((token) => token.includes("/"));

const sourcesOf = async (): Promise<{ file: string; text: string }[]> => {
	const paths = ["justfile", "package.json"];
	for await (const path of new Glob(".github/workflows/*.yml").scan(ROOT)) {
		paths.push(path);
	}
	return Promise.all(
		paths
			.sort((a, b) => a.localeCompare(b))
			.map(async (path) => ({
				file: path,
				text: await bunFile(join(ROOT, path)).text(),
			})),
	);
};

describe("the gate names only files that exist", () => {
	test("every `bun <file>` command of a recipe, a script, or a workflow is on disk", async () => {
		const sources = await sourcesOf();

		const missing = (
			await Promise.all(
				sources.flatMap(({ file, text }) =>
					filesRun(text).map(async (run) => ({
						where: `${file}: bun ${run}`,
						exists: await bunFile(join(ROOT, run)).exists(),
					})),
				),
			)
		)
			.filter(({ exists }) => !exists)
			.map(({ where }) => where);

		expect(sources.length).toBeGreaterThan(1);
		expect(missing).toEqual([]);
	});

	test("the `ci` workflow installs the pinned Claude Code version", async () => {
		const text = await bunFile(join(ROOT, ".github/workflows/ci.yml")).text();

		const installs = [...text.matchAll(INSTALLED)].map((match) => match[1]);

		expect(installs).toEqual([MIN_CLAUDE_CODE_VERSION]);
	});

	test("every action a workflow uses is pinned to a commit", async () => {
		const sources = (await sourcesOf()).filter(({ file }) =>
			file.startsWith(".github/"),
		);

		const loose = sources.flatMap(({ file, text }) =>
			[...text.matchAll(USES)]
				.map((match) => match[1] ?? "")
				.filter((ref) => !PINNED.test(ref))
				.map((ref) => `${file}: ${ref}`),
		);

		expect(sources.length).toBeGreaterThan(0);
		expect(loose).toEqual([]);
	});

	test("the pinned version is the one `README.md` tells a user to install", async () => {
		const text = await bunFile(join(ROOT, "README.md")).text();

		expect(text).toContain(`\`${MIN_CLAUDE_CODE_VERSION}\``);
	});
});
