import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chdir, cwd } from "node:process";
import { changedSinceSeed, seedCommit, sh, workDiff } from "../grading.ts";

const git = (...args: string[]) =>
	sh(["git", "-c", "user.name=t", "-c", "user.email=t@t", ...args]);

let home = "";
let repo = "";

beforeEach(async () => {
	home = cwd();
	repo = await mkdtemp(join(tmpdir(), "grading-"));
	chdir(repo);
	await git("init", "-q");
	await writeFile("a.ts", "one\n");
	await writeFile("b.ts", "same\n");
	await git("add", "-A");
	await git("commit", "-qm", "seed");
});

afterEach(async () => {
	chdir(home);
	await rm(repo, { recursive: true, force: true });
});

describe("a session that commits its work", () => {
	test("the diff still holds the committed change", async () => {
		await writeFile("a.ts", "two\n");
		await git("commit", "-qam", "ship");

		expect(await workDiff("a.ts")).toContain("+two");
	});

	test("a committed file counts as changed and an untouched one does not", async () => {
		await writeFile("a.ts", "two\n");
		await git("commit", "-qam", "ship");

		expect(await changedSinceSeed("a.ts")).toBe(true);
		expect(await changedSinceSeed("b.ts")).toBe(false);
	});
});

describe("`seedCommit`", () => {
	test("names the original file even after the session commits an edit", async () => {
		await writeFile("a.ts", "two\n");
		await git("commit", "-qam", "ship");

		const original = await sh(["git", "show", `${await seedCommit()}:a.ts`]);
		const head = await sh(["git", "show", "HEAD:a.ts"]);

		expect(original.out).toBe("one\n");
		expect(head.out).toBe("two\n");
	});
});

describe("a session that installs a dependency", () => {
	test("`workDiff` with an excluded `node_modules` holds only the source", async () => {
		await mkdir("node_modules/dep", { recursive: true });
		await writeFile("node_modules/dep/index.js", "for (;;) {}\n");
		await writeFile("a.ts", "two\n");

		const diff = await workDiff(".", ":(exclude)node_modules");

		expect(diff).toContain("+two");
		expect(diff).not.toContain("for (;;)");
	});
});

describe("a session that leaves its work uncommitted", () => {
	test("a new file shows in the diff", async () => {
		await writeFile("c.ts", "new\n");

		expect(await workDiff()).toContain("+new");
	});
});
