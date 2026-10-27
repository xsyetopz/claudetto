// Behavior of the checks that `tools/release.ts` runs before its first tag, and of the rollback of its tags, in a temporary git repository.

import { expect, test } from "bun:test";
import path from "node:path";
import { $, write as bunWrite } from "bun";
import {
	makeTags,
	type Plan,
	preflight,
	tagExists,
} from "../../tools/preflight.ts";
import { tmpDir } from "../support/repo.ts";

const committedRepo = async (): Promise<string> => {
	const root = await tmpDir("preflight");
	await $`git init -q`.cwd(root);
	await bunWrite(path.join(root, "a.txt"), "a\n");
	await $`git add a.txt`.cwd(root);
	await $`git -c user.name=t -c user.email=t@example.com -c commit.gpgsign=false commit -qm init`.cwd(
		root,
	);
	return root;
};

const PLANS: Plan[] = [
	{ dir: "plugins/a", tag: "t-a" },
	{ dir: "plugins/b", tag: "t-b" },
];

/** A tag step that tags the plan of `dir` in `root`. */
const tagEach = (root: string) => async (dir: string) => {
	await $`git -c tag.gpgsign=false tag ${dir === "plugins/a" ? "t-a" : "t-b"}`.cwd(
		root,
	);
};

const passes = async () => true;
const fails = async () => false;

test("a clean repository with no tag of the release and matching generated files passes", async () => {
	const root = await committedRepo();
	expect(
		await preflight({ root, tags: ["v1-a"], generatedOk: passes }),
	).toStrictEqual([]);
});

test("an uncommitted change stops the preflight", async () => {
	const root = await committedRepo();
	await bunWrite(path.join(root, "a.txt"), "changed\n");
	const problems = await preflight({
		root,
		tags: ["v1-a"],
		generatedOk: passes,
	});
	expect(problems).toHaveLength(1);
});

test("an untracked file stops the preflight", async () => {
	const root = await committedRepo();
	await bunWrite(path.join(root, "new.txt"), "new\n");
	const problems = await preflight({
		root,
		tags: ["v1-a"],
		generatedOk: passes,
	});
	expect(problems).toHaveLength(1);
});

test("generated files that differ from their sources stop the preflight", async () => {
	const root = await committedRepo();
	const problems = await preflight({
		root,
		tags: ["v1-a"],
		generatedOk: fails,
	});
	expect(problems).toHaveLength(1);
});

test("a tag of the release that already exists stops the preflight", async () => {
	const root = await committedRepo();
	await $`git -c tag.gpgsign=false tag v1-a`.cwd(root);
	const problems = await preflight({
		root,
		tags: ["v1-a", "v1-b"],
		generatedOk: passes,
	});
	expect(problems).toHaveLength(1);
});

test("a failed tag step deletes the tags that the run made, and then fails", async () => {
	const root = await committedRepo();
	const tagDir = async (dir: string) => {
		if (dir === "plugins/b") {
			throw new Error("tag step failed");
		}
		await $`git -c tag.gpgsign=false tag t-a`.cwd(root);
	};
	await expect(makeTags(root, PLANS, tagDir)).rejects.toThrow(
		"tag step failed",
	);
	expect(await tagExists(root, "t-a")).toBe(false);
	expect(await tagExists(root, "t-b")).toBe(false);
});

test("a failed push deletes the tags that the run made, and then fails", async () => {
	const root = await committedRepo();
	const tagDir = tagEach(root);
	const push = async () => {
		throw new Error("push failed");
	};
	await expect(makeTags(root, PLANS, tagDir, push)).rejects.toThrow(
		"push failed",
	);
	expect(await tagExists(root, "t-a")).toBe(false);
	expect(await tagExists(root, "t-b")).toBe(false);
});

test("a release whose tag steps all succeed keeps its tags", async () => {
	const root = await committedRepo();
	const tagDir = tagEach(root);
	await makeTags(root, PLANS, tagDir);
	expect(await tagExists(root, "t-a")).toBe(true);
	expect(await tagExists(root, "t-b")).toBe(true);
});
