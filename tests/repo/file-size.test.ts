// Each code file keeps one concern in a size that a reader or a model holds in full: a source file has at most `SOURCE_LINES_MAX` lines, and a test file at most `TEST_LINES_MAX` (the user, 2026-10-27: "break down non .test.ts files <=300 LOC, and .test.ts files <=500 LOC", "Separation Of Concerns principle").
// The test lists the files with git, so an untracked file counts and an ignored one does not.

import { expect, test } from "bun:test";
import path from "node:path";
import { file as bunFile, spawn } from "bun";
import { REPO } from "../support/repo.ts";

const SOURCE_LINES_MAX = 300;
const TEST_LINES_MAX = 500;
const CODE = /\.(?:ts|mts|cts|js|mjs|cjs)$/;
const TEST = /\.test\.ts$/;

/** The code files of the repository that git tracks or would track. */
const codeFiles = async (): Promise<string[]> => {
	const r = spawn(["git", "ls-files", "-co", "--exclude-standard", "-z"], {
		cwd: REPO,
		stdout: "pipe",
	});
	const listed = await new Response(r.stdout).text();
	const names = listed.split("\0").filter((name) => CODE.test(name));
	const found = await Promise.all(
		names.map(async (name) => ({
			name,
			exists: await bunFile(path.join(REPO, name)).exists(),
		})),
	);
	return found.filter((f) => f.exists).map((f) => f.name);
};

const linesOf = async (name: string): Promise<number> =>
	(await bunFile(path.join(REPO, name)).text()).split("\n").length - 1;

test("File Size: each source file has at most 300 lines, and each test file at most 500", async () => {
	const names = await codeFiles();

	const sized = await Promise.all(
		names.map(async (name) => ({
			name,
			lines: await linesOf(name),
			max: TEST.test(name) ? TEST_LINES_MAX : SOURCE_LINES_MAX,
		})),
	);

	expect(
		sized.filter((f) => f.lines > f.max).map((f) => `${f.name}: ${f.lines}`),
	).toStrictEqual([]);
});
