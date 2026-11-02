import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { $, file } from "bun";
import { offerIgnores } from "../cli.ts";

let dir: string;

const git = async (...args: string[]): Promise<void> => {
	await $`git -C ${dir} ${args}`.quiet();
};

const read = async (name: string): Promise<string> =>
	await readFile(join(dir, name), "utf8");

const repo = async (): Promise<void> => {
	await writeFile(join(dir, "go.mod"), "module x\n");
	await git("add", ".");
};

beforeEach(async () => {
	dir = await mkdtemp(join(tmpdir(), "ignore-"));
	await git("init", "-q");
});

afterEach(async () => {
	await rm(dir, { recursive: true, force: true });
});

describe("`offerIgnores`", () => {
	test("a dry run shows the diff and writes nothing", async () => {
		await repo();

		const report = await offerIgnores(dir, { dryRun: true }, async () => true);

		expect(report).toContain("+++ .gitignore");
		expect(report).toContain("+vendor/");
		expect(await file(join(dir, ".gitignore")).exists()).toBe(false);
	});

	test("a no writes nothing", async () => {
		await repo();

		const report = await offerIgnores(
			dir,
			{ dryRun: false },
			async () => false,
		);

		expect(report).toContain("Wrote no ignore file");
		expect(await file(join(dir, ".gitignore")).exists()).toBe(false);
	});

	test("a yes writes the block and keeps the user lines", async () => {
		await repo();
		await writeFile(
			join(dir, ".gitignore"),
			`mine
!Thumbs.db
`,
		);

		await offerIgnores(dir, { dryRun: false }, async () => true);

		const text = await read(".gitignore");
		expect(
			text.startsWith(`mine
!Thumbs.db

# >>> claudetto`),
		).toBe(true);
		expect(text).not.toContain("\nThumbs.db\n");
		expect(text).toContain("\n*.swp\n");
	});

	test("a second run asks nothing", async () => {
		await repo();
		await offerIgnores(dir, { dryRun: false }, async () => true);
		let asked = false;

		const report = await offerIgnores(dir, { dryRun: false }, async () => {
			asked = true;
			return true;
		});

		expect(asked).toBe(false);
		expect(report).toContain("up to date");
	});

	test("a repo that has an `AGENTS.md` is still offered the ignore files", async () => {
		await repo();
		await writeFile(join(dir, "AGENTS.md"), "mine\n");
		let asked = false;

		await offerIgnores(dir, { dryRun: false }, async () => {
			asked = true;
			return false;
		});

		expect(asked).toBe(true);
	});

	test("a folder that is not a repo is offered nothing", async () => {
		const bare = await mkdtemp(join(tmpdir(), "bare-"));

		const report = await offerIgnores(
			bare,
			{ dryRun: false },
			async () => true,
		);

		expect(report).toContain("not a git repo");
		expect(await file(join(bare, ".gitignore")).exists()).toBe(false);
		await rm(bare, { recursive: true, force: true });
	});

	test("a file edited after the plan keeps its new lines", async () => {
		await repo();

		await offerIgnores(dir, { dryRun: false }, async () => {
			await writeFile(join(dir, ".gitignore"), "late\n");
			return true;
		});

		expect(
			(await read(".gitignore")).startsWith(`late

# >>> claudetto`),
		).toBe(true);
	});
});
